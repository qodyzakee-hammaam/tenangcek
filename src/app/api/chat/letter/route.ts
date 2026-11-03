import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini/client';
import {
  TRIAGE_BUDGET,
  TRIAGE_MODEL_LADDER,
  attemptTimeout,
  availableModels,
  cooldownError,
  markModelFailed,
  markModelHealthy,
} from '@/lib/gemini/resilience';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LetterRequestBody {
  messages: ChatMessage[];
  triageContext?: {
    mainSymptom?: string;
    duration?: string;
    severity?: string;
    accompanyingSymptoms?: string[];
    urgencyLevel?: string;
    reasoning?: string;
    nextSteps?: string[];
    doctorSummary?: {
      summary: string;
      threeQuestionsForDoctor: string[];
    };
  };
}

export interface DoctorLetterData {
  documentId: string;
  generatedAt: string;
  patientOverview: {
    mainSymptom: string;
    duration: string;
    severity: string;
    accompanyingSymptoms: string[];
    urgencyLevel: string;
    urgencyLabel: string;
  };
  clinicalSummary: string;
  chatInsights: string[];
  dangerSignsToWatch: string[];
  homeCareTried: string[];
  suggestedQuestionsForDoctor: string[];
  doctorNoteClosing: string;
}

const URGENCY_LABELS: Record<string, string> = {
  darurat: 'Darurat Medis (Emergency)',
  segera: 'Pemeriksaan Segera 24 Jam (Urgent)',
  terjadwal: 'Pemeriksaan Terjadwal (Semi-Urgent)',
  pantau_di_rumah: 'Pemantauan Mandiri di Rumah (Non-Urgent)',
};

export async function POST(request: Request) {
  try {
    const body: LetterRequestBody = await request.json();
    const { messages, triageContext } = body;

    const mainSymptom = triageContext?.mainSymptom || 'Keluhan Umum';
    const duration = triageContext?.duration || 'Beberapa saat';
    const severity = triageContext?.severity || 'sedang';
    const urgency = triageContext?.urgencyLevel || 'pantau_di_rumah';
    const urgencyLabel = URGENCY_LABELS[urgency] || 'Pemantauan Mandiri di Rumah';
    const accompanying = triageContext?.accompanyingSymptoms || [];

    const now = new Date();
    const documentId = `TC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedAt = now.toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const apiKey = process.env.GEMINI_API_KEY;
    const isApiKeyConfigured = apiKey && apiKey.length > 10;

    let parsedResult: Partial<DoctorLetterData> | null = null;

    if (isApiKeyConfigured) {
      try {
        const chatTranscript = (messages || [])
          .map((m) => `${m.role === 'user' ? 'Pasien' : 'Asisten'}: ${m.content}`)
          .join('\n');

        const prompt = `
Anda adalah dokter konsultan asisten triase klinis. Buatkan isi "LEMBAR CATATAN KELUHAN PASIEN & PENGANTAR KONSULTASI MEDIS" yang sangat profesional, runtut, dan terstruktur untuk diserahkan dan dibaca oleh dokter pemeriksa di fasilitas pelayanan kesehatan (Puskesmas/Klinik/RS).

DATA TRIASE AWAL:
- Keluhan Utama: "${mainSymptom}"
- Durasi Gejala: "${duration}"
- Tingkat Keparahan Menurut Pasien: "${severity}"
- Gejala Tambahan: "${accompanying.join(', ') || 'Tidak ada'}"
- Klasifikasi Urgensi Awal: "${urgencyLabel}"

TRANSKRIP DISKUSI PASIEN:
${chatTranscript}

TUGAS ANDA:
Rangkum seluruh keluhan, riwayat onset, faktor pencetus/pereda, serta kekhawatiran spesifik pasien ke dalam format JSON murni:
{
  "clinicalSummary": "Narasi medis runtut 2-3 paragraf kronologis mengenai keluhan pasien, onset, pola sensasi yang dirasakan, dan dinamika gejala",
  "chatInsights": ["3-5 poin penting atau detail khusus yang diungkapkan pasien saat berdiskusi (misal: rasa nyeri tertentu, pantangan makanan, rasa cemas, dll.)"],
  "dangerSignsToWatch": ["2-3 tanda bahaya fisik (red flags) yang relevan untuk diobservasi lebih lanjut oleh dokter"],
  "homeCareTried": ["2-3 tindakan pertolongan pertama, hidrasi, istirahat, atau konsumsi obat bebas yang telah dilakukan pasien di rumah"],
  "suggestedQuestionsForDoctor": ["3-4 pertanyaan klinis cerdas dan terarah yang dianjurkan diajukan pasien ke dokter saat tatap muka"],
  "doctorNoteClosing": "Catatan singkat profesional dari TenangCek untuk dokter pemeriksa"
}
Output HARUS JSON murni tanpa markdown pembungkus.
`;

        const response = await requestLetterJson(prompt);
        if (response) parsedResult = JSON.parse(response);
      } catch (err) {
        // Log hanya jenis error: tidak boleh memuat isi percakapan (AGENTS.md §2.12).
        console.warn(
          `Gemini surat tidak tersedia (${err instanceof Error ? err.name : 'unknown'}), memakai engine lokal.`
        );
      }
    }

    // Fallback jika API Key belum dipasang atau parsing gagal
    if (!parsedResult || !parsedResult.clinicalSummary) {
      parsedResult = generateFallbackDoctorLetter(mainSymptom, duration, severity, urgencyLabel, accompanying, messages);
    }

    const fullLetter: DoctorLetterData = {
      documentId,
      generatedAt,
      patientOverview: {
        mainSymptom,
        duration,
        severity,
        accompanyingSymptoms: accompanying,
        urgencyLevel: urgency,
        urgencyLabel,
      },
      clinicalSummary: parsedResult.clinicalSummary || `Pasien datang dengan keluhan ${mainSymptom} yang dirasakan sejak ${duration} dengan tingkat keparahan ${severity}.`,
      chatInsights: parsedResult.chatInsights || [
        `Pasien mengonfirmasi keluhan utama berupa ${mainSymptom}`,
        `Durasi keluhan telah berlangsung selama ${duration}`,
        `Tingkat kecemasan pasien terpantau membutuhkan edukasi dan penjelasan medis terarah`,
      ],
      dangerSignsToWatch: parsedResult.dangerSignsToWatch || [
        'Peningkatan intensitas keluhan secara mendadak atau bertahap dalam 24 jam',
        'Muncul tanda sistemik seperti demam tinggi berkelanjutan atau lemas berlebih',
        'Gejala tidak responsif terhadap istirahat dan hidrasi adekuat',
      ],
      homeCareTried: parsedResult.homeCareTried || [
        'Hidrasi cairan air putih hangat berkala',
        'Istirahat fisik dan pembatasan aktivitas berat',
        'Pemantauan harian gejala melalui TenangCek Symptom Diary',
      ],
      suggestedQuestionsForDoctor: parsedResult.suggestedQuestionsForDoctor || [
        'Apakah gejala ini mengindikasikan kondisi yang membutuhkan tes diagnostik penunjang?',
        'Berapa lama batas waktu wajar gejala ini sembuh dengan perawatan standar?',
        'Adakah pantangan makanan atau aktivitas spesifik yang wajib dihindari selama masa pemulihan?',
      ],
      doctorNoteClosing: parsedResult.doctorNoteClosing || 'Lembar pengantar ini dibuat otomatis oleh sistem TenangCek AI Companion sebagai sarana anamnesis awal mandiri pasien.',
    };

    return NextResponse.json({
      success: true,
      letter: fullLetter,
    });
  } catch (error) {
    console.error('API /api/chat/letter error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat surat pengantar dokter' },
      { status: 500 }
    );
  }
}

/**
 * Minta JSON surat dokter dengan model cadangan.
 * Model pertama yang sedang kehabisan kuota/kelebihan beban dilewati cepat,
 * sehingga surat tetap bisa dibuat tanpa menunggu lama.
 */
async function requestLetterJson(prompt: string): Promise<string | null> {
  const client = getGeminiClient();
  const deadline = Date.now() + TRIAGE_BUDGET.totalMs;
  const models = availableModels(TRIAGE_MODEL_LADDER);

  if (models.length === 0) throw cooldownError();

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    const timeoutMs = attemptTimeout(TRIAGE_BUDGET, deadline, index === models.length - 1);
    if (timeoutMs === null) break;

    const startedAt = Date.now();
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });

      markModelHealthy(model);
      return response.text || null;
    } catch (error) {
      markModelFailed(model, error, Date.now() - startedAt);
    }
  }

  return null;
}

function generateFallbackDoctorLetter(
  mainSymptom: string,
  duration: string,
  severity: string,
  urgencyLabel: string,
  accompanying: string[],
  messages?: ChatMessage[]
): Partial<DoctorLetterData> {
  const userMessages = (messages || [])
    .filter((m) => m.role === 'user')
    .map((m) => m.content);

  const insights = [
    `Keluhan utama: Pasien merasakan ${mainSymptom} yang berlangsung sekitar ${duration}.`,
    `Tingkat keparahan yang dilaporkan: ${severity}.`,
    accompanying.length ? `Gejala penyerta yang tercatat: ${accompanying.join(', ')}.` : 'Tidak ada keluhan penyerta khusus yang dilaporkan pada triase awal.',
  ];

  if (userMessages.length > 0) {
    insights.push(`Pertanyaan pasien selama konsultasi: "${userMessages.slice(-2).join('; ')}"`);
  }

  return {
    clinicalSummary: `Pasien melakukan konsultasi mandiri berbasis triase dengan keluhan utama berupa ${mainSymptom}. Gejala dilaporkan telah berlangsung selama kurun waktu ${duration} dengan derajat gangguan aktivitas berkategori ${severity}. ${
      accompanying.length > 0
        ? `Terdapat keluhan penyerta berupa ${accompanying.join(', ')}.`
        : 'Tidak dilaporkan adanya keluhan penyerta berat pada tahap skrining awal.'
    } Pasien mencari arahan mengenai langkah penanganan terarah dan pemilahan tingkat urgensi medis. Evaluasi triase awal mengklasifikasikan kondisi ini dalam kategori "${urgencyLabel}".`,
    chatInsights: insights,
    dangerSignsToWatch: [
      'Peningkatan rasa sakit/gejala secara drastis dalam 12 - 24 jam ke depan',
      'Munculnya keluhan baru seperti sesak napas, pusing berputar, atau muntah terus-menerus',
      'Penurunan kesadaran atau demam tinggi yang tidak reda dengan terapi suportif',
    ],
    homeCareTried: [
      'Istirahat tirah baring dan pembatasan paparan layar / stres fisik',
      'Pemberian asupan cairan dan hidrasi air putih hangat adekuat',
      'Pencatatan perkembangan harian gejala mandiri',
    ],
    suggestedQuestionsForDoctor: [
      `Apakah kondisi ${mainSymptom} ini memerlukan pemeriksaan laboratorium atau penunjang klinis khusus?`,
      'Apa terapi medikamentosa yang paling tepat dan aman untuk kondisi saya saat ini?',
      'Kapan batas waktu evaluasi jika gejala belum kunjung mereda sepenuhnya?',
      'Tanda-tanda apa yang mengharuskan saya segera datang kembali ke fasilitas gawat darurat?',
    ],
    doctorNoteClosing:
      'Dokumen ini disusun sebagai ringkasan komunikasi keluhan awal pasien dari TenangCek AI Health Companion untuk mendukung efisiensi anamnesis dokter pemeriksa.',
  };
}
