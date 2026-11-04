import { getAuthHeaders } from '@/lib/supabase/client';
import { fromDbUrgency } from '@/lib/db/urgency';
import type { HistoryEntry } from '@/lib/triage/localHistory';
import type { UrgencyLevelDb } from '@/types/database';
import type { UrgencyLevel } from '@/types/triage';

/**
 * Akses riwayat dari server untuk komponen client.
 *
 * Dipisah dari komponen supaya dashboard, profil, dan alur cek gejala memakai
 * bentuk data yang sama. Tidak ada data mentah yang dicatat ke log.
 */

export interface ServerHistoryItem {
  id: string;
  symptomName: string;
  duration: string | null;
  urgencyLevel: UrgencyLevelDb;
  reasoning: string;
  createdAt: string;
  doctorSummary: { summary: string; threeQuestionsForDoctor: string[] } | null;
}

export type HistoryMode = 'account' | 'guest' | 'consent_required';

export interface HistoryQuery {
  /** Instant ISO, batas bawah (inklusif). */
  from?: string;
  /** Instant ISO, batas atas (inklusif). */
  to?: string;
  /** Level urgensi versi UI. */
  urgency?: UrgencyLevel[];
  /** Cursor instant ISO untuk halaman berikutnya. */
  before?: string;
  limit?: number;
}

export interface HistoryResult {
  mode: HistoryMode;
  items: HistoryEntry[];
  total: number;
  hasMore: boolean;
  nextBefore: string | null;
}

interface HistoryResponse {
  success?: boolean;
  mode?: HistoryMode;
  data?: ServerHistoryItem[];
  meta?: {
    total?: number;
    hasMore?: boolean;
    nextBefore?: string | null;
  };
}

export function toHistoryEntry(item: ServerHistoryItem): HistoryEntry {
  return {
    id: `session-${item.id}`,
    sessionId: item.id,
    symptomName: item.symptomName,
    duration: item.duration,
    urgencyLevel: fromDbUrgency(item.urgencyLevel),
    reasoning: item.reasoning,
    createdAt: item.createdAt,
    doctorSummary: item.doctorSummary,
  };
}

/**
 * Ambil riwayat akun. Mengembalikan `null` bila permintaan gagal, agar
 * pemanggil bisa menampilkan pesan tanpa mengubah status auth.
 */
export async function fetchServerHistory(query: HistoryQuery = {}): Promise<HistoryResult | null> {
  try {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.urgency && query.urgency.length > 0) params.set('urgency', query.urgency.join(','));
    if (query.before) params.set('before', query.before);
    if (query.limit) params.set('limit', String(query.limit));

    const search = params.toString();
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/triage/history${search ? `?${search}` : ''}`, {
      headers,
      cache: 'no-store',
    });
    const json = (await res.json()) as HistoryResponse;

    if (!res.ok || !json.success) return null;

    const mode: HistoryMode =
      json.mode === 'consent_required' ? 'consent_required' : json.mode === 'guest' ? 'guest' : 'account';

    return {
      mode,
      items: mode === 'account' ? (json.data ?? []).map(toHistoryEntry) : [],
      total: mode === 'account' ? json.meta?.total ?? 0 : 0,
      hasMore: mode === 'account' ? json.meta?.hasMore === true : false,
      nextBefore: mode === 'account' ? json.meta?.nextBefore ?? null : null,
    };
  } catch {
    // Gangguan jaringan: bukan kesalahan pengguna.
    return null;
  }
}
