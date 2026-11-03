/**
 * Ketahanan pemanggilan Gemini yang dipakai bersama oleh triage, chat, dan surat dokter.
 *
 * Kenapa berlapis:
 * - Gemini free tier membatasi kuota **per model**. `429` berarti kuota model
 *   itu habis, jadi model tersebut dijeda sesuai `retryDelay` dari server, dan
 *   model lain di daftar cadangan tetap dicoba.
 * - `503 UNAVAILABLE` ("high demand") bersifat sementara dan biasanya hanya
 *   mengenai satu model. Model itu dijeda singkat, lalu dicoba model berikutnya
 *   agar pengguna tidak menerima kegagalan yang sebenarnya bisa dihindari.
 * - Setiap model hanya dicoba **sekali** per permintaan. Mengulang model yang
 *   sama tidak menambah peluang berhasil, hanya menambah waktu tunggu.
 * - Semua pemanggilan dibatasi anggaran waktu; hasil rule-based sudah aman dan
 *   urgensi akhir tetap ditentukan safety layer (AGENTS.md §2.2, §2.4).
 */

/**
 * Model "lite" dipakai lebih dulu untuk percakapan: jawabannya jauh lebih
 * cepat (sub-detik) sehingga chat terasa hidup, sedangkan model penuh baru
 * dicoba bila lite benar-benar gagal.
 */
export const CHAT_MODEL_LADDER = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
] as const;

/**
 * Triage dan surat dokter butuh penalaran lebih dalam, jadi model penuh
 * didahulukan. "Lite" ditaruh sebelum model versi lama supaya ada cadangan
 * cepat ketika alias `latest` sedang kehabisan kuota atau kelebihan beban.
 */
export const TRIAGE_MODEL_LADDER = [
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
] as const;

export interface GeminiBudget {
  /** Total waktu yang boleh dipakai seluruh percobaan model. */
  totalMs: number;
  /** Batas satu percobaan, termasuk menunggu token pertama. */
  perAttemptMs: number;
  /** Waktu yang disisihkan agar model cadangan masih kebagian. */
  reserveMs: number;
  /** Sisa waktu minimum agar percobaan berikutnya masih masuk akal. */
  minAttemptMs: number;
}

/**
 * Chat: pengguna membaca jawaban sambil menunggu, jadi token pertama harus
 * cepat. Model yang belum mengirim apa pun dalam beberapa detik dilewati.
 */
export const CHAT_BUDGET: GeminiBudget = {
  totalMs: 14_000,
  perAttemptMs: 7_000,
  reserveMs: 5_000,
  minAttemptMs: 3_000,
};

/**
 * Triage/surat: pengguna sudah menunggu hasil, jadi beri ruang lebih lega
 * untuk model penuh, tetapi cadangan tetap dijamin kebagian waktu.
 */
export const TRIAGE_BUDGET: GeminiBudget = {
  totalMs: 20_000,
  perAttemptMs: 12_000,
  reserveMs: 6_000,
  minAttemptMs: 3_000,
};

const DEFAULT_COOLDOWN_MS = 60_000;
const MIN_COOLDOWN_MS = 15_000;
/**
 * Batas atas cooldown. Kuota harian free tier tidak akan pulih dalam hitungan
 * menit, jadi model yang kehabisan kuota harian dijeda cukup lama agar tidak
 * diborong percuma, tetapi tetap dicoba lagi secara berkala.
 */
const MAX_COOLDOWN_MS = 30 * 60_000;
/** 503/500 hanya gangguan sesaat: jeda singkat, jangan terlalu lama mematikan model. */
const TRANSIENT_COOLDOWN_MS = 30_000;
const TRANSIENT_MAX_COOLDOWN_MS = 2 * 60_000;
/** Model yang tidak dikenal/dicabut tidak akan berubah dalam waktu dekat. */
const MISSING_MODEL_COOLDOWN_MS = 60 * 60_000;
/** Cooldown setelah model berulang kali tidak mengirim token pertama. */
const TIMEOUT_COOLDOWN_MS = 60_000;

const QUOTA_EXHAUSTED_STATUS = 429;
const NOT_FOUND_STATUS = 404;

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

export function readStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return null;
}

/** Kode status bisa juga hanya muncul di dalam pesan error (payload JSON upstream). */
function readStatusFromMessage(message: string): number | null {
  const match = message.match(/"code"\s*:\s*(\d{3})/);
  if (match) {
    const code = Number(match[1]);
    if (code >= 400 && code <= 599) return code;
  }
  return null;
}

export function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Status HTTP efektif: dari properti `status`, atau dari payload pesan. */
export function readErrorStatus(error: unknown): number | null {
  return readStatus(error) ?? readStatusFromMessage(readErrorMessage(error));
}

/** Timeout kami sendiri muncul sebagai AbortError/TimeoutError tanpa status HTTP. */
export function isTimeoutLike(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
  const message = error.message.toLowerCase();
  return message.includes('timeout') || message.includes('timed out');
}

/** `"37s"` / `"37.5s"` → milidetik. Nilai lain diabaikan. */
function parseDelayString(value: string): number | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return null;
  const ms = Math.round(Number(match[1]) * 1000);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/**
 * Telusuri objek error untuk menemukan `retryDelay`.
 * SDK bisa menaruhnya di `error.details`; kalau tidak, payload JSON di pesan
 * error tetap memuatnya. Kedalaman dibatasi agar payload aneh tidak membuat
 * rekursi tak berujung.
 */
function findRetryDelay(value: unknown, depth = 0): number | null {
  if (depth > 6 || typeof value !== 'object' || value === null) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRetryDelay(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.retryDelay === 'string') {
    const parsed = parseDelayString(record.retryDelay);
    if (parsed !== null) return parsed;
  }

  for (const nested of Object.values(record)) {
    const found = findRetryDelay(nested, depth + 1);
    if (found !== null) return found;
  }

  return null;
}

/**
 * Saran waktu tunggu dari server (429), dalam milidetik.
 * Tidak ada request tambahan: hanya membaca respons yang sudah diterima.
 */
export function readRetryDelayMs(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;

  const details = (error as { details?: unknown }).details;
  const fromDetails = findRetryDelay(details);
  if (fromDetails !== null) return fromDetails;

  const message = readErrorMessage(error);
  try {
    const fromJson = findRetryDelay(JSON.parse(message));
    if (fromJson !== null) return fromJson;
  } catch {
    // Pesan bukan JSON; lanjut ke pola teks di bawah.
  }

  const match = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return match ? parseDelayString(`${match[1]}s`) : null;
}

export function clampCooldown(ms: number, min = MIN_COOLDOWN_MS, max = MAX_COOLDOWN_MS): number {
  return Math.min(Math.max(ms, min), max);
}

export type GeminiFailureKind = 'quota' | 'transient' | 'timeout' | 'missing' | 'unknown';

export interface GeminiFailure {
  kind: GeminiFailureKind;
  status: number | null;
  /** Lama model ini sebaiknya dilewati. `0` berarti cukup dicatat saja. */
  cooldownMs: number;
}

/**
 * Terjemahkan error menjadi keputusan: model dijeda berapa lama.
 *
 * - `429` → kuota model habis; ikuti `retryDelay` server, lalu dijeda minimal
 *   15 detik dan maksimal 30 menit.
 * - `500/502/503/504` → kelebihan beban sementara; jeda singkat.
 * - timeout → bukan salah model, cukup hitung; setelah dua kali baru dijeda.
 * - `404` → model tidak tersedia untuk API key ini; lewati lama.
 */
export function classifyGeminiFailure(error: unknown): GeminiFailure {
  const status = readErrorStatus(error);

  if (status === QUOTA_EXHAUSTED_STATUS) {
    const suggested = readRetryDelayMs(error);
    return {
      kind: 'quota',
      status,
      cooldownMs: suggested !== null ? clampCooldown(suggested) : DEFAULT_COOLDOWN_MS,
    };
  }

  if (status === NOT_FOUND_STATUS) {
    return { kind: 'missing', status, cooldownMs: MISSING_MODEL_COOLDOWN_MS };
  }

  if (status !== null && status >= 500) {
    return {
      kind: 'transient',
      status,
      cooldownMs: clampCooldown(TRANSIENT_COOLDOWN_MS, MIN_COOLDOWN_MS, TRANSIENT_MAX_COOLDOWN_MS),
    };
  }

  if (isTimeoutLike(error)) {
    return { kind: 'timeout', status, cooldownMs: 0 };
  }

  return { kind: 'unknown', status, cooldownMs: 0 };
}

/**
 * Status model per proses.
 *
 * Saat sebuah model kehabisan kuota atau sedang kelebihan beban, setiap
 * pengguna berikutnya tidak perlu menunggu kegagalan yang sama. Model itu
 * dilewati sampai cooldown berakhir, lalu dicoba lagi. Pada deployment
 * multi-instance setiap instance punya catatan sendiri; itu tetap jauh lebih
 * baik daripada tidak ada sama sekali.
 */
interface ModelHealth {
  cooldownUntil: number;
  consecutiveTimeouts: number;
}

const modelHealth = new Map<string, ModelHealth>();

function getHealth(model: string): ModelHealth {
  const existing = modelHealth.get(model);
  if (existing) return existing;
  const created: ModelHealth = { cooldownUntil: 0, consecutiveTimeouts: 0 };
  modelHealth.set(model, created);
  return created;
}

/** Model dari daftar yang boleh dicoba sekarang, sesuai urutan prioritas. */
export function availableModels(
  ladder: readonly string[],
  now = Date.now()
): string[] {
  return ladder.filter((model) => getHealth(model).cooldownUntil <= now);
}

export function markModelHealthy(model: string): void {
  const health = getHealth(model);
  health.cooldownUntil = 0;
  health.consecutiveTimeouts = 0;
}

/**
 * Catat kegagalan sebuah model dan tentukan cooldown-nya.
 * Log hanya memuat nama model, status, dan jenis error — tidak pernah isi
 * gejala atau pesan pengguna (AGENTS.md §2.12).
 */
export function markModelFailed(model: string, error: unknown, elapsedMs: number): GeminiFailure {
  const failure = classifyGeminiFailure(error);
  const health = getHealth(model);

  if (failure.kind === 'timeout') {
    health.consecutiveTimeouts += 1;
  } else {
    health.consecutiveTimeouts = 0;
  }

  // Timeout sekali bisa jadi karena jaringan lokal; dua kali berturut-turut
  // menandakan model memang lambat untuk kita sehingga lebih baik dilewati.
  const cooldownMs =
    failure.kind === 'timeout' && health.consecutiveTimeouts < 2
      ? 0
      : failure.kind === 'timeout'
        ? TIMEOUT_COOLDOWN_MS
        : failure.cooldownMs;

  const reason = failure.kind === 'timeout' ? `timeout>${elapsedMs}ms` : (failure.status ?? '-');
  console.warn(
    `Gemini gagal: model=${model} status=${reason} jenis=${
      error instanceof Error ? error.name : 'unknown'
    } (${elapsedMs}ms)`
  );

  if (cooldownMs > 0) {
    health.cooldownUntil = Date.now() + cooldownMs;
    console.warn(
      `Gemini jeda model=${model} ${Math.round(cooldownMs / 1000)} detik: ${
        failure.kind === 'quota'
          ? 'kuota habis (429)'
          : failure.kind === 'transient'
            ? `gangguan sementara (${failure.status ?? '-'})`
            : failure.kind === 'missing'
              ? 'model tidak tersedia (404)'
              : 'gagal berulang'
      }.`
    );
  }

  return { ...failure, cooldownMs };
}

/**
 * Anggaran waktu untuk satu percobaan model.
 * Mengembalikan `null` bila sisa waktu sudah tidak layak dipakai.
 */
export function attemptTimeout(
  budget: GeminiBudget,
  deadline: number,
  isLastModel: boolean,
  now = Date.now()
): number | null {
  const usable = deadline - now - (isLastModel ? 0 : budget.reserveMs);
  if (usable < budget.minAttemptMs) return null;
  return Math.min(usable, budget.perAttemptMs);
}

/** Error standar ketika tidak ada model yang bisa dipakai sama sekali. */
export function cooldownError(): GeminiUnavailableError {
  return new GeminiUnavailableError(
    'Semua model Gemini sedang dijeda setelah gagal berulang',
    null,
    0
  );
}
