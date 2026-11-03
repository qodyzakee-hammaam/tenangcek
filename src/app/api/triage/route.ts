import { NextResponse } from "next/server";
import { SymptomPayload, TriageResult, TriageSource } from "@/types/triage";
import { RedFlagCheckResult } from "@/types/triage";
import type { UrgencyLevelDb } from "@/types/database";
import { checkRedFlags } from "@/lib/rules/redFlags";
import { validateAndEnforceSafety } from "@/lib/rules/safetyLayer";
import { generateTriage, GeminiUnavailableError } from "@/lib/gemini/generate";
import { toDbUrgency, maxDbUrgency } from "@/lib/db/urgency";
import { requireConsent } from "@/lib/supabase/auth";
import { saveTriageSession } from "@/lib/db/repository/sessions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload: SymptomPayload = await request.json();

    if (!payload.mainSymptom || payload.mainSymptom.trim() === "") {
      return NextResponse.json({ error: "Gejala utama tidak boleh kosong" }, { status: 400 });
    }

    // 1. RULE-BASED RED FLAG CHECK (Deterministics Cut-off)
    const ruleCheck = checkRedFlags(payload);

    if (ruleCheck.hasRedFlag && ruleCheck.matchedRule) {
      const emergencyResponse: TriageResult = {
        urgencyLevel: "darurat",
        isRedFlagTriggered: true,
        reasoning: `Gejala yang Anda laporkan cocok dengan tanda bahaya: ${ruleCheck.matchedRule.description}`,
        commonCauses: ["Kondisi darurat yang membutuhkan penanganan medis segera"],
        dangerSignsToWatch: ["Sesak napas semakin berat", "Penurunan kesadaran atau pingsan", "Nyeri yang semakin meluas atau tak tertahankan"],
        nextSteps: [ruleCheck.matchedRule.action, "Minta bantuan orang di sekitar untuk mendampingi atau mengantar.", "Bawa identitas diri (KTP/BPJS) jika memungkinkan."],
        doctorSummary: {
          summary: `Pasien mengalami gejala berpotensi darurat: ${payload.mainSymptom}. Memicu tanda bahaya ${ruleCheck.matchedRule.description}.`,
          threeQuestionsForDoctor: ["Apakah kondisi ini memerlukan observasi rawat inap segera?", "Pemeriksaan penunjang (EKG/Lab/Rontgen) apa yang perlu segera dilakukan?", "Apa langkah pertolongan pertama selama di ruang observasi?"],
        },
        calmSupport: {
          message: "Tarik napas perlahan. Anda mengambil langkah yang tepat dengan mencari tahu sekarang. Fokus utama sekarang adalah tiba di faskes terdekat dengan aman.",
          suggestBreathingExercise: false,
        },
        confidenceNotes: "Terdeteksi otomatis via Rule-based Red Flag Engine.",
      };

      const persistence = await persistTriageSession(request, payload, emergencyResponse, ruleCheck);

      return NextResponse.json({
        success: true,
        data: emergencyResponse,
        meta: { ...persistence, aiSource: "rule_based" satisfies TriageSource },
      });
    }

    // 2. GEMINI AI TRIAGE (Dengan fallback graceful bila API key belum diset)
    let aiTriageResult: TriageResult;
    let aiSource: TriageSource = "rule_based";
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback cerdas rule-based jika user belum memasukkan Gemini API Key
      aiTriageResult = createFallbackTriageResult(payload);
    } else {
      try {
        aiTriageResult = await generateTriage(payload);
        aiSource = "gemini";
      } catch (geminiError) {
        // Log hanya status/tipe kesalahan: tidak boleh memuat isi gejala
        // (AGENTS.md §2.12). Fallback rule-based tetap aman karena urgensi
        // akhir ditentukan safety layer.
        const status = geminiError instanceof GeminiUnavailableError ? geminiError.status : null;
        const attempts = geminiError instanceof GeminiUnavailableError ? geminiError.attempts : null;
        const reason = attempts === 0 ? 'cooldown' : (status ?? 'tidak diketahui');
        console.error(
          `Gemini tidak tersedia (${reason}, percobaan: ${attempts ?? 'tidak diketahui'}), memakai fallback rule-based.`
        );
        aiTriageResult = createFallbackTriageResult(payload);
      }
    }

    // 3. SAFETY LAYER VALIDATION
    const finalResult = validateAndEnforceSafety(aiTriageResult, ruleCheck);

    // 4. PERSISTENSI OPSIONAL (hanya login + persetujuan; guest tidak menulis DB)
    const persistence = await persistTriageSession(request, payload, finalResult, ruleCheck);

    return NextResponse.json({
      success: true,
      data: finalResult,
      meta: { ...persistence, aiSource },
    });
  } catch (error) {
    // Jangan pernah mencatat isi gejala/keluhan ke log (AGENTS.md §2.12).
    console.error("API /api/triage gagal memproses permintaan");
    return NextResponse.json({ success: false, error: { code: "triage_failed", message: "Terjadi kesalahan dalam memproses triage" } }, { status: 500 });
  }
}

interface PersistenceMeta {
  persisted: boolean;
  sessionId?: string;
  reason?: "guest" | "consent_required" | "save_failed" | "unavailable";
}

/**
 * Simpan sesi triage bila pengguna login dan sudah memberi persetujuan.
 * Kegagalan menyimpan tidak boleh menggagalkan hasil triage.
 * Teks pemicu krisis tidak disimpan; hanya penanda red_flag_triggered.
 */
async function persistTriageSession(request: Request, payload: SymptomPayload, result: TriageResult, ruleCheck: RedFlagCheckResult): Promise<PersistenceMeta> {
  try {
    const auth = await requireConsent(request);

    if (!auth.ok) {
      if (auth.status === 401) return { persisted: false, reason: "guest" };
      if (auth.error.code === "consent_required") return { persisted: false, reason: "consent_required" };
      return { persisted: false, reason: "unavailable" };
    }

    // Safety layer lapis kedua: `final_urgency` tidak boleh di bawah rule_floor
    // (AGENTS.md §2.2). Penulisan DB memakai nilai yang sudah dimaksimalkan.
    const ruleFloor: UrgencyLevelDb | null = ruleCheck.matchedRule ? toDbUrgency(ruleCheck.matchedRule.severity) : null;
    const aiLevel = toDbUrgency(result.urgencyLevel);
    const finalLevel = ruleFloor ? maxDbUrgency(aiLevel, ruleFloor) : aiLevel;

    const anxietyBefore = typeof payload.anxietyBefore === "number" && Number.isInteger(payload.anxietyBefore) && payload.anxietyBefore >= 1 && payload.anxietyBefore <= 5 ? payload.anxietyBefore : null;

    const saved = await saveTriageSession(auth.userId, {
      symptoms: {
        mainSymptom: payload.mainSymptom,
        duration: payload.duration ?? null,
        severity: payload.severity ?? null,
        accompanyingSymptoms: payload.accompanyingSymptoms ?? [],
      },
      answers: {
        anxietyBefore: payload.anxietyBefore ?? null,
      },
      urgencyLevel: finalLevel,
      reasoning: result.reasoning,
      nextSteps: result.nextSteps ?? [],
      ruleFloor,
      redFlagTriggered: ruleCheck.hasRedFlag,
      result: {
        commonCauses: result.commonCauses ?? [],
        dangerSignsToWatch: result.dangerSignsToWatch ?? [],
        doctorSummary: result.doctorSummary ?? null,
        calmSupport: result.calmSupport ?? null,
      },
      anxietyBefore,
    });

    return saved.checkinSaved ? { persisted: true, sessionId: saved.sessionId } : { persisted: true, sessionId: saved.sessionId, reason: "save_failed" };
  } catch {
    return { persisted: false, reason: "save_failed" };
  }
}

/**
 * Fallback triage cerdas ketika Gemini API key belum dikonfigurasi
 */
function createFallbackTriageResult(payload: SymptomPayload): TriageResult {
  const symptomLower = payload.mainSymptom.toLowerCase();
  const isHighSeverity = payload.severity === "berat";
  const duration = (payload.duration || "").toLowerCase();
  const isLongDuration = duration.includes("minggu") || duration.includes("bulan") || duration.includes(">3 hari");

  let level: TriageResult["urgencyLevel"] = "pantau_di_rumah";
  let reason = "Gejala yang Anda rasakan umumnya dapat membaik dengan istirahat yang cukup dan hidrasi teratur.";
  let causes = ["Kelelahan fisik atau stres pikiran", "Dehidrasi / kurang minum cairan", "Pola tidur tidak teratur"];

  if (isHighSeverity || isLongDuration) {
    level = "segera";
    reason = "Gejala terasa cukup mengganggu atau sudah berlangsung beberapa hari, sehingga dianjurkan diperiksa oleh dokter umum dalam 24 jam.";
    causes = ["Reaksi infeksi umum ringan-sedang", "Ketegangan otot atau radang lokal", "Kelelahan berlebih"];
  } else if (symptomLower.includes("demam") || symptomLower.includes("batuk") || symptomLower.includes("pusing")) {
    level = "terjadwal";
    reason = "Gejala umum yang lazim dialami dan biasanya memerlukan istirahat serta konsultasi bila tidak mereda dalam 2-3 hari.";
    causes = ["Infeksi virus pernapasan ringan", "Kurang istirahat", "Perubahan cuaca"];
  }

  return {
    urgencyLevel: level,
    reasoning: reason,
    commonCauses: causes,
    dangerSignsToWatch: ["Demam tinggi >39°C yang tidak turun dengan pereda demam", "Gejala bertambah parah secara drastis dalam 12 jam", "Muncul rasa lemas berlebih hingga sulit bangun"],
    nextSteps: ["Minum air putih hangat minimal 2 liter per hari.", "Istirahatkan tubuh dari aktivitas layar dan tugas berat.", "Catat perkembangan gejala di Symptom Diary untuk memantau perbaikan."],
    doctorSummary: {
      summary: `Pasien mengeluhkan ${payload.mainSymptom} dengan durasi ${payload.duration || "beberapa saat"}, keparahan ${payload.severity || "sedang"}.`,
      threeQuestionsForDoctor: ["Berapa lama batas wajar gejala ini sebelum perlu pemeriksaan lanjutan?", "Apakah ada aktivitas atau makanan tertentu yang perlu saya hindari?", "Kapan tanda saya harus segera kembali kontrol?"],
    },
    calmSupport: {
      message: "Kekhawatiran Anda sangat wajar, tetapi sebagian besar gejala semacam ini bisa pulih dengan waktu dan istirahat. Tarik napas perlahan, Anda sudah melakukan langkah pencegahan yang tepat.",
      suggestBreathingExercise: true,
    },
    confidenceNotes: "Saran dihasilkan oleh Triage Engine Standar TenangCek.",
  };
}
