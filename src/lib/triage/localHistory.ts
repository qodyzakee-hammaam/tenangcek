import type { UrgencyLevel } from '@/types/triage';

/**
 * Cache riwayat triage di perangkat.
 *
 * Kenapa dipisah dari komponen:
 * - Kunci penyimpanan harus ditentukan dari identitas yang **sudah pasti**,
 *   bukan tebakan `user?.id || 'guest'`. Kalau salah kunci, data akun bisa
 *   tertulis ke kunci tamu lalu tetap terlihat setelah logout.
 * - Semua baca/tulis divalidasi supaya data rusak di localStorage tidak
 *   membuat dashboard gagal render.
 *
 * Data akun tetap disimpan di database; cache ini hanya untuk mode tamu dan
 * untuk menampilkan riwayat yang belum sempat tersimpan ke akun.
 */

export const GUEST_HISTORY_KEY = 'tenangcek_sessions_guest';
const KEY_PREFIX = 'tenangcek_sessions_';

/** Catatan dokter juga berisi data kesehatan, jadi kuncinya di-scope per akun. */
export const LETTERS_KEY_PREFIX = 'tenangcek_doctor_letters';
const LEGACY_LETTERS_KEY = 'tenangcek_doctor_letters';

export function lettersKey(userId: string | null): string {
  return `${LETTERS_KEY_PREFIX}_${userId ?? 'guest'}`;
}

export interface HistoryEntry {
  /** Id untuk kebutuhan render (`session-<uuid>` atau `local-<timestamp>`). */
  id: string;
  /** Id baris `symptom_sessions` bila sesi tersimpan di akun. */
  sessionId?: string;
  symptomName: string;
  duration?: string | null;
  urgencyLevel: UrgencyLevel;
  reasoning: string;
  createdAt: string;
  doctorSummary?: { summary: string; threeQuestionsForDoctor: string[] } | null;
}

/** Kunci cache untuk pengguna tertentu, atau kunci tamu bila belum login. */
export function historyKey(userId: string | null): string {
  return userId ? `${KEY_PREFIX}${userId}` : GUEST_HISTORY_KEY;
}

function isUrgencyLevel(value: unknown): value is UrgencyLevel {
  return (
    value === 'darurat' ||
    value === 'segera' ||
    value === 'terjadwal' ||
    value === 'pantau_di_rumah'
  );
}

function toEntry(value: unknown): HistoryEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.symptomName !== 'string' || raw.symptomName.trim() === '') return null;
  if (!isUrgencyLevel(raw.urgencyLevel)) return null;

  const createdAt =
    typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
      ? raw.createdAt
      : new Date().toISOString();

  const summary = raw.doctorSummary as Record<string, unknown> | null | undefined;
  const doctorSummary =
    summary && typeof summary.summary === 'string'
      ? {
          summary: summary.summary,
          threeQuestionsForDoctor: Array.isArray(summary.threeQuestionsForDoctor)
            ? summary.threeQuestionsForDoctor.filter((q): q is string => typeof q === 'string')
            : [],
        }
      : null;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `local-${Date.parse(createdAt)}`,
    sessionId: typeof raw.sessionId === 'string' && raw.sessionId ? raw.sessionId : undefined,
    symptomName: raw.symptomName.trim().slice(0, 200),
    duration: typeof raw.duration === 'string' ? raw.duration : null,
    urgencyLevel: raw.urgencyLevel,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : '',
    createdAt,
    doctorSummary,
  };
}

/** Baca cache; entri rusak dilewati, bukan melempar error. */
export function readLocalHistory(userId: string | null): HistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(historyKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(toEntry)
      .filter((entry): entry is HistoryEntry => entry !== null)
      .slice(0, 50);
  } catch {
    return [];
  }
}

/**
 * Tulis cache. Mengembalikan `false` bila penyimpanan tidak tersedia
 * (mode privat / kuota penuh) agar pemanggil bisa memberi tahu pengguna
 * alih-alih gagal diam-diam.
 */
export function writeLocalHistory(userId: string | null, entries: HistoryEntry[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(historyKey(userId), JSON.stringify(entries.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

export function prependLocalHistory(userId: string | null, entry: HistoryEntry): boolean {
  const existing = readLocalHistory(userId).filter((item) => item.sessionId !== entry.sessionId);
  return writeLocalHistory(userId, [entry, ...existing]);
}

/**
 * Hapus entri tertentu dari cache tamu (dipakai setelah impor ke akun).
 * Menerima id lokal maupun id sesi server, karena entri tamu belum tentu
 * punya `sessionId`.
 */
export function removeGuestHistoryEntries(ids: string[]): void {
  if (typeof window === 'undefined' || ids.length === 0) return;

  const remaining = readLocalHistory(null).filter(
    (entry) => !ids.includes(entry.id) && (!entry.sessionId || !ids.includes(entry.sessionId))
  );
  writeLocalHistory(null, remaining);
}

/**
 * Bersihkan cache milik akun mana pun saat logout, tanpa menyentuh kunci tamu.
 * Ini mencegah riwayat pengguna sebelumnya masih terlihat setelah logout,
 * termasuk setelah halaman di-refresh.
 */
export function clearAccountHistories(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(KEY_PREFIX) && key !== GUEST_HISTORY_KEY) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Pembersihan bersifat best-effort; kegagalan tidak boleh menghalangi logout.
  }
}

/**
 * Bersihkan catatan dokter milik akun di perangkat ini.
 * Kunci lama tanpa akhiran (`tenangcek_doctor_letters`) juga dihapus karena
 * tidak bisa dipastikan pemiliknya.
 */
export function clearAccountLetters(): void {
  if (typeof window === 'undefined') return;

  try {
    const guestKey = lettersKey(null);
    const accountPrefix = `${LETTERS_KEY_PREFIX}_`;
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key === LEGACY_LETTERS_KEY) {
        keys.push(key);
        continue;
      }
      if (key.startsWith(accountPrefix) && key !== guestKey) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Best-effort.
  }
}

/** Gabungkan riwayat dari beberapa sumber tanpa duplikasi. */
export function mergeHistory(...groups: HistoryEntry[][]): HistoryEntry[] {
  const seen = new Set<string>();
  const merged: HistoryEntry[] = [];

  for (const group of groups) {
    for (const entry of group) {
      const key = entry.sessionId ? `session:${entry.sessionId}` : `local:${entry.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }
  }

  return merged.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 50);
}
