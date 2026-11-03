import type { Content, GenerateContentResponse } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini/client';
import {
  CHAT_BUDGET,
  CHAT_MODEL_LADDER,
  GeminiUnavailableError,
  attemptTimeout,
  availableModels,
  cooldownError,
  markModelFailed,
  markModelHealthy,
  readErrorMessage,
  readErrorStatus,
} from '@/lib/gemini/resilience';

/**
 * Pembukaan stream chat ke Gemini dengan daftar model cadangan.
 *
 * `generateContentStream` baru mengembalikan stream setelah respons HTTP
 * pertama diterima, jadi galat seperti `503 UNAVAILABLE` atau `429` muncul saat
 * `await` — tepat di sini. Karena itu setiap model dibatasi waktunya sendiri:
 * model yang menolak/gagal cepat dilewati, dan model berikutnya tetap dicoba.
 */
export interface ChatStreamRequest {
  contents: Content[];
  systemInstruction: string;
  temperature?: number;
}

export interface OpenedChatStream {
  model: string;
  /** Potongan teks siap kirim ke klien. */
  stream: AsyncGenerator<string, void, unknown>;
}

/**
 * Batas diam di tengah stream. Model bisa menerima permintaan lalu berhenti
 * mengirim token; tanpa batas ini pengguna melihat indikator mengetik selamanya.
 */
const IDLE_TIMEOUT_MS = 20_000;

export async function openChatStream({
  contents,
  systemInstruction,
  temperature = 0.6,
}: ChatStreamRequest): Promise<OpenedChatStream> {
  const client = getGeminiClient();
  const deadline = Date.now() + CHAT_BUDGET.totalMs;
  const models = availableModels(CHAT_MODEL_LADDER);

  if (models.length === 0) throw cooldownError();

  let lastError: unknown = null;
  let attempts = 0;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    const timeoutMs = attemptTimeout(CHAT_BUDGET, deadline, index === models.length - 1);
    if (timeoutMs === null) break;

    attempts += 1;
    const startedAt = Date.now();
    // `abortSignal` berlaku untuk seluruh umur stream, jadi timer ini hanya
    // dipakai selama pengambilan stream dan dibatalkan setelah berhasil.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const raw = await client.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timer);
      markModelHealthy(model);
      return { model, stream: readTextChunks(raw, controller) };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      markModelFailed(model, error, Date.now() - startedAt);
      // Coba model berikutnya; model yang gagal sudah dijeda sesuai jenisnya.
    }
  }

  if (attempts === 0) throw cooldownError();

  throw new GeminiUnavailableError(
    readErrorMessage(lastError),
    readErrorStatus(lastError),
    attempts
  );
}

/**
 * Bungkus stream SDK menjadi potongan teks, dengan penjaga waktu diam.
 * Koneksi selalu ditutup di `finally` supaya tidak ada request menggantung
 * ketika stream selesai, gagal, atau klien berhenti membaca.
 */
async function* readTextChunks(
  raw: AsyncGenerator<GenerateContentResponse>,
  controller: AbortController
): AsyncGenerator<string, void, unknown> {
  const iterator = raw[Symbol.asyncIterator]();

  try {
    while (true) {
      const next = await nextWithIdleTimeout(iterator, controller);
      if (next.done) return;

      const text = next.value?.text;
      if (text) yield text;
    }
  } finally {
    // Hentikan koneksi ke Gemini lebih dulu agar `return` di bawah tidak
    // menunggu jaringan yang mungkin masih menggantung.
    if (!controller.signal.aborted) controller.abort();
    try {
      await iterator.return?.(undefined);
    } catch {
      // Stream sudah tertutup; tidak ada yang perlu dilakukan.
    }
  }
}

function nextWithIdleTimeout(
  iterator: AsyncIterator<GenerateContentResponse>,
  controller: AbortController
): Promise<IteratorResult<GenerateContentResponse>> {
  const pending = iterator.next();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new GeminiUnavailableError('Stream Gemini berhenti mengirim data', null, 1));
    }, IDLE_TIMEOUT_MS);

    pending.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
