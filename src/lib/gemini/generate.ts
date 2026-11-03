import type { TriageResult, SymptomPayload } from '@/types/triage';
import { getGeminiClient } from '@/lib/gemini/client';
import { TENANGCEK_SYSTEM_PROMPT, buildTriagePrompt } from '@/lib/gemini/prompts';
import { TRIAGE_JSON_SCHEMA } from '@/lib/gemini/schemas';

/**
 * Pemanggilan Gemini untuk triage, dengan ketahanan terhadap gangguan sementara.
 *
 * Kenapa berlapis:
 * - Gemini sering mengembalikan 503/429 saat permintaan sedang tinggi. Satu
 *   kegagalan tidak boleh langsung membuang hasil AI bila percobaan ulang
 *   singkat bisa berhasil.
 * - Model "latest" bisa sedang penuh; satu model flash lain dipakai sebagai
 *   cadangan.
 * - Semua dibatasi anggaran waktu (BUDGET_MS). Pengguna tidak boleh menunggu
 *   lama hanya untuk mendapatkan teks AI: hasil rule-based sudah aman dan
 *   urgensi akhir tetap ditentukan safety layer (AGENTS.md §2.2, §2.4).
 * - Jika semua gagal, pemanggil memakai fallback rule-based.
 */

const MODEL_LADDER = ['gemini-flash-latest', 'gemini-3.8-flash'] as const;

/** Kode yang layak dicoba ulang pada model yang sama (kuota sesaat/timeout).
 * 503/500/502/504 biasanya berarti model sedang penuh secara global, jadi
 * lebih cepat pindah ke model cadangan daripada mengulang model yang sama. */
const RETRY_SAME_MODEL_STATUS = new Set([408, 429]);

const BUDGET_MS = 12_000;
const PER_REQUEST_TIMEOUT_MS = 8_000;
const ATTEMPTS_PER_MODEL = 2;
const BASE_DELAY_MS = 300;
/** Sisa waktu minimum agar percobaan berikutnya masih masuk akal. */
const MIN_ATTEMPT_MS = 1_500;

export class GeminiUnavailableError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly attempts: number
  ) {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

function readStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return null;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function shouldRetrySameModel(error: unknown): boolean {
  const status = readStatus(error);
  if (status !== null) return RETRY_SAME_MODEL_STATUS.has(status);
  // Timeout/jaringan tidak punya status; masih layak dicoba ulang.
  const message = readErrorMessage(error).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted') ||
    message.includes('fetch failed') ||
    message.includes('network')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestTriage(
  model: string,
  payload: SymptomPayload,
  timeoutMs: number
): Promise<TriageResult> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: TENANGCEK_SYSTEM_PROMPT }, { text: buildTriagePrompt(payload) }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: TRIAGE_JSON_SCHEMA,
      temperature: 0.2, // Rendah untuk stabilitas & konsistensi medis
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });

  const rawText = response.text || '{}';
  return JSON.parse(rawText) as TriageResult;
}

export async function generateTriage(payload: SymptomPayload): Promise<TriageResult> {
  const deadline = Date.now() + BUDGET_MS;
  let lastError: unknown = null;
  let attempts = 0;

  for (const model of MODEL_LADDER) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt += 1) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) {
        throw new GeminiUnavailableError(readErrorMessage(lastError), readStatus(lastError), attempts);
      }

      attempts += 1;
      const startedAt = Date.now();

      try {
        return await requestTriage(model, payload, Math.min(remaining, PER_REQUEST_TIMEOUT_MS));
      } catch (error) {
        lastError = error;

        // Log tanpa isi gejala (AGENTS.md §2.12): hanya model, status, waktu.
        console.warn(
          `Gemini gagal: model=${model} percobaan=${attempt} status=${
            readStatus(error) ?? '-'
          } jenis=${error instanceof Error ? error.name : 'unknown'} (${Date.now() - startedAt}ms)`
        );

        if (!shouldRetrySameModel(error)) {
          // 404 (model tidak tersedia) atau 503 (model penuh secara global):
          // tidak ada gunanya mengulang model yang sama, pindah ke cadangan.
          break;
        }

        if (attempt < ATTEMPTS_PER_MODEL) {
          const pause = Math.min(BASE_DELAY_MS * attempt, deadline - Date.now() - MIN_ATTEMPT_MS);
          if (pause > 0) await delay(pause);
        }
      }
    }
  }

  throw new GeminiUnavailableError(readErrorMessage(lastError), readStatus(lastError), attempts);
}
