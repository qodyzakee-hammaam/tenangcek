import { NextResponse } from 'next/server';
import { ChatStep } from '@/types/triage';
import { openChatStream } from '@/lib/gemini/chatStream';
import { GeminiUnavailableError } from '@/lib/gemini/resilience';
import { buildChatSystemInstruction } from '@/lib/gemini/prompts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  triageContext?: {
    mainSymptom?: string;
    duration?: string;
    severity?: string;
    accompanyingSymptoms?: string[];
    urgencyLevel?: string;
    reasoning?: string;
    nextSteps?: string[];
  };
}

/**
 * GET: Mengembalikan langkah onboarding triase awal (5 pilar)
 */
export async function GET() {
  const steps: ChatStep[] = [
    {
      step: 1,
      id: 'main_symptom',
      question: 'Apa gejala atau keluhan utama yang paling Anda rasakan saat ini?',
      helperText: 'Ceritakan dengan kata-kata santai, atau pilih gejala umum di bawah.',
      quickOptions: ['Sakit Kepala', 'Demam', 'Batuk & Pilek', 'Nyeri Perut', 'Pusing / Kleyengan', 'Mual'],
      type: 'text',
    },
    {
      step: 2,
      id: 'duration',
      question: 'Sudah berapa lama gejala tersebut Anda rasakan?',
      helperText: 'Durasi membantu menentukan seberapa cepat langkah penanganan yang dibutuhkan.',
      quickOptions: ['Baru beberapa jam', '1 - 2 hari', '3 - 5 hari', 'Lebih dari 1 minggu'],
      type: 'options',
    },
    {
      step: 3,
      id: 'severity',
      question: 'Seberapa besar gejala ini mengganggu aktivitas sehari-hari Anda?',
      helperText: 'Pilih tingkat keparahan yang paling menggambarkan kondisi Anda saat ini.',
      quickOptions: [
        'Ringan (masih bisa beraktivitas biasa)',
        'Sedang (cukup mengganggu, butuh istirahat sesekali)',
        'Berat (sangat mengganggu, sulit beraktivitas)',
      ],
      type: 'options',
    },
    {
      step: 4,
      id: 'accompanying',
      question: 'Apakah ada gejala lain yang menyertai keluhan Anda?',
      helperText: 'Tuliskan gejala tambahan jika ada, atau pilih jika tidak ada.',
      quickOptions: ['Tidak ada gejala lain', 'Lemas / lesu', 'Nafsu makan turun', 'Nyeri otot / pegal', 'Sulit tidur'],
      type: 'text',
    },
    {
      step: 5,
      id: 'anxiety',
      question: 'Sebelum melihat hasil, seberapa cemas yang Anda rasakan terkait kondisi ini? (Skala 1 - 5)',
      helperText: '1 = Sangat tenang, 5 = Sangat cemas / overthinking.',
      quickOptions: ['1 - Tenang', '2 - Sedikit khawatir', '3 - Cukup cemas', '4 - Cemas tinggi', '5 - Sangat panik'],
      type: 'rating',
    },
  ];

  return NextResponse.json({ success: true, steps });
}

/**
 * POST: Endpoint percakapan interaktif lanjutan dengan TenangCek AI Companion
 */
export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const { messages, triageContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Pesan percakapan tidak boleh kosong' },
        { status: 400 }
      );
    }

    const latestMessage = messages[messages.length - 1];
    const userPrompt = latestMessage.content.trim();
    const history = messages.slice(0, messages.length - 1);

    const apiKey = process.env.GEMINI_API_KEY;
    const isApiKeyConfigured = apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 10;

    // 1. Jika API Key Gemini sudah terpasang, panggil Gemini API
    if (isApiKeyConfigured) {
      try {
        const systemInstruction = buildChatSystemInstruction(triageContext);

        // Format riwayat chat untuk Gemini SDK
        const contents = [
          ...history.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ];

        // Daftar model cadangan + batas waktu ditangani di openChatStream:
        // 503 "high demand" pada satu model tidak lagi menggagalkan percakapan.
        const { model, stream: textStream } = await openChatStream({
          contents,
          systemInstruction,
          temperature: 0.6,
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const text of textStream) {
                controller.enqueue(encoder.encode(text));
              }
              controller.close();
            } catch (streamError) {
              // Log hanya status/jenis: tidak boleh memuat isi percakapan
              // (AGENTS.md §2.12).
              console.warn(
                `Gemini chat terputus: model=${model} jenis=${
                  streamError instanceof Error ? streamError.name : 'unknown'
                }`
              );
              controller.enqueue(
                encoder.encode(
                  '\n\nMaaf, jawaban terputus di tengah jalan. Silakan kirim ulang pertanyaan Anda.'
                )
              );
              controller.close();
            }
          },
          cancel() {
            // Klien menutup koneksi: hentikan stream upstream agar tidak terus
            // memakai kuota Gemini untuk jawaban yang tidak dibaca siapa pun.
            void textStream.return(undefined);
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-AI-Provider': 'gemini',
            'X-AI-Model': model,
          },
        });
      } catch (geminiError) {
        // Log hanya status, tanpa isi pesan pengguna (AGENTS.md §2.12).
        const status =
          geminiError instanceof GeminiUnavailableError
            ? (geminiError.status ?? 'cooldown')
            : 'tidak diketahui';
        console.warn(`Gemini chat tidak tersedia (status: ${status}), memakai mode cadangan.`);

        // Fallback cerdas jika ada kendala jaringan / kuota
        const fallbackReply = generateFallbackChatReply(userPrompt, triageContext);
        return new Response(
          `${fallbackReply}\n\n*(Catatan: asisten AI sedang sibuk, jadi jawaban ini disusun dari panduan edukasi TenangCek.)*`,
          {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'X-AI-Provider': 'fallback',
            },
          }
        );
      }
    }

    // 2. Jika API Key belum dikonfigurasi, gunakan Asisten Cerdas TenangCek (Simulasi Handal)
    const fallbackReply = generateFallbackChatReply(userPrompt, triageContext);
    return new Response(
      `${fallbackReply}\n\n*(Catatan: mode edukasi TenangCek. Jawaban disusun dari panduan internal, bukan diagnosis dokter.)*`,
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-AI-Provider': 'fallback',
        },
      }
    );
  } catch (error) {
    console.error('API /api/chat error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses chat' },
      { status: 500 }
    );
  }
}

/**
 * Mesin respons cerdas kontekstual ketika Gemini API Key belum dipasang
 */
function generateFallbackChatReply(
  prompt: string,
  context?: ChatRequestBody['triageContext']
): string {
  const p = prompt.toLowerCase();
  const symptom = context?.mainSymptom || 'keluhan Anda';
  const duration = context?.duration || 'beberapa hari';
  const severity = context?.severity || 'sedang';

  // 1. Topik Makanan / Minuman / Pantangan
  if (p.includes('makan') || p.includes('minum') || p.includes('pantang') || p.includes('es') || p.includes('kopi')) {
    return `Terkait asupan makanan dan minuman saat mengalami **${symptom}**:

1. **Hal yang Disarankan:**
   - Utamakan air putih hangat dalam jumlah cukup (minimal 1,5 - 2 liter per hari) untuk menjaga hidrasi dan sirkulasi tubuh.
   - Pilih makanan bertekstur lembut dan mudah dicerna (seperti sup kaldu hangat, bubur, atau buah kaya air seperti semangka dan pisang).
2. **Hal yang Sebaiknya Dibatasi Sementara:**
   - Minuman berkafein tinggi (kopi kental, teh pekat) atau minuman berenergi karena dapat meningkatkan dehidrasi atau denyut nadi.
   - Makanan yang terlalu pedas, sangat berlemak, atau terlalu asam yang bisa memicu asam lambung atau ketidaknyamanan perut.
   - Minuman terlalu dingin/manis jika disertai keluhan batuk atau radang tenggorokan.

Fokuskan tubuh untuk mendapatkan nutrisi yang menenangkan terlebih dahulu ya.`;
  }

  // 2. Topik Obat / Pengobatan / Parasetamol
  if (p.includes('obat') || p.includes('parasetamol') || p.includes('panadol') || p.includes('resep') || p.includes('minum apa')) {
    return `Mengenai penggunaan obat untuk **${symptom}**:

- Untuk meredakan rasa nyeri ringan-sedang atau demam, obat bebas (Over The Counter / OTC) seperti **Parasetamol** umumnya aman diminum sesudah makan sesuai dosis yang tertera pada label kemasan.
- **Penting:** Hindari mengonsumsi antibiotik atau obat resep keras tanpa anjuran langsung dari dokter, karena antibiotik hanya untuk infeksi bakteri tertentu dan tidak efektif untuk infeksi virus.
- Jika Anda memiliki riwayat alergi obat, gangguan lambung (maag), atau sedang hamil/menyusui, sangat dianjurkan untuk berkonsultasi dengan apoteker atau dokter terlebih dahulu sebelum minum obat apa pun.

Apakah ada obat tertentu yang saat ini sedang Anda pertimbangkan?`;
  }

  // 3. Topik Kapan Harus ke Dokter / Tanda Bahaya / Rumah Sakit
  if (p.includes('dokter') || p.includes('igd') || p.includes('rumah sakit') || p.includes('bahaya') || p.includes('parah')) {
    return `Kondisi **${symptom}** Anda yang sudah dirasakan selama **${duration}** sebaiknya segera diperiksakan langsung ke dokter apabila muncul tanda-tanda berikut:

- **Tanda Waspada Utama:**
  1. Gejala tidak kunjung membaik atau malah bertambah berat setelah 2 - 3 hari perawatan mandiri.
  2. Demam tinggi di atas 38,5°C yang tidak turun setelah minum obat penurun demam.
  3. Disertai kesulitan bernapas (sesak), nyeri dada menjalar, pusing berputar hebat, atau muntah terus-menerus.
  4. Muncul rasa lemas ekstrem hingga sulit bangun dari tempat tidur.

Jika Anda merasa cemas dan ragu, memeriksakan diri ke Puskesmas atau klinik terdekat adalah keputusan yang sangat baik untuk mendapatkan ketenangan pikiran dan evaluasi fisik secara langsung.`;
  }

  // 4. Topik Cemas / Takut Penyakit Parah / Overthinking
  if (p.includes('takut') || p.includes('cemas') || p.includes('panik') || p.includes('mati') || p.includes('kanker') || p.includes('overthinking')) {
    return `Sangat wajar jika Anda merasa khawatir saat tubuh memberikan sinyal berupa **${symptom}**. Ketika kita mencari gejala di internet, mesin pencari sering kali menampilkan kemungkinan-kemungkinan terburuk yang sebenarnya sangat jarang terjadi.

Mari ambil napas dalam perlahan:
1. Sebagian besar keluhan ${symptom} sehari-hari disebabkan oleh hal-hal yang lazim, seperti kelelahan fisik, kurang tidur, stres, dehidrasi, atau infeksi musiman biasa.
2. Tubuh Anda memiliki daya tahan yang sedang bekerja memulihkan diri.
3. Anda sudah mengambil langkah bijak dengan melakukan pengecekan triase awal di TenangCek.

Cobalah istirahatkan mata sejenak dari layar dan lakukan latihan pernapasan 4-4-4 selama 2 menit. Anda tidak sendirian, dan keluhan ini sangat bisa ditangani secara bertahap.`;
  }

  // 5. Topik Pertolongan Pertama / Perawatan di Rumah
  if (p.includes('pertolongan') || p.includes('ngapain') || p.includes('cara mengatasi') || p.includes('tips') || p.includes('istirahat')) {
    return `Langkah pertolongan pertama dan perawatan mandiri yang tepat untuk **${symptom}** (${severity}) saat ini:

1. **Rehatkan Tubuh & Pikiran:** Berbaringlah di ruangan yang sejuk, tenang, dan memiliki pencahayaan lembut. Kurangi aktivitas multitasking dan layar gadget.
2. **Cukupi Cairan:** Minum air putih hangat secara berkala sedikit demi sedikit.
3. **Kompres Nyaman:** Bila ada rasa tegang atau demam, Anda bisa menggunakan kompres hangat pada dahi/leher untuk memberikan rasa rileks.
4. **Catat Perubahan:** Amati apakah ada perubahan gejala dalam 12 - 24 jam ke depan di Symptom Diary TenangCek.

Apakah ada hal spesifik lainnya yang terasa mengganjal atau membuat Anda kurang nyaman?`;
  }

  // 6. Respon Umum Berdasarkan Konteks
  return `Saya memahami rasa tidak nyaman yang Anda rasakan akibat **${symptom}** yang sudah berlangsung **${duration}**.

Sebagai panduan mendasar:
- Prioritas utama saat ini adalah memberikan waktu bagi tubuh Anda untuk beristirahat dan memulihkan energi.
- Pantau apakah intensitasnya berkurang setelah Anda cukup beristirahat dan minum air putih.
- Jangan ragu untuk membuat janji dengan dokter umum jika gejala ini mulai mengganggu aktivitas penting Anda sehari-hari.

Ada yang ingin Anda tanyakan lagi seputar perawatan mandiri, pola makan, atau hal yang perlu diwaspadai? Saya siap mendampingi Anda.`;
}
