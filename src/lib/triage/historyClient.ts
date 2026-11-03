import { getAuthHeaders } from '@/lib/supabase/client';
import { fromDbUrgency } from '@/lib/db/urgency';
import type { HistoryEntry } from '@/lib/triage/localHistory';
import type { UrgencyLevelDb } from '@/types/database';

/**
 * Akses riwayat dari server untuk komponen client.
 *
 * Dipisah dari komponen supaya dashboard dan alur cek gejala memakai bentuk
 * data yang sama. Tidak ada data mentah yang dicatat ke log.
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

export interface HistoryResult {
  mode: HistoryMode;
  items: HistoryEntry[];
}

interface HistoryResponse {
  success?: boolean;
  mode?: HistoryMode;
  data?: ServerHistoryItem[];
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
 * pemanggil bisa jatuh ke cache perangkat tanpa mengubah mode menjadi tamu.
 */
export async function fetchServerHistory(): Promise<HistoryResult | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/triage/history', { headers, cache: 'no-store' });
    const json = (await res.json()) as HistoryResponse;

    if (!res.ok || !json.success) return null;

    const mode: HistoryMode =
      json.mode === 'consent_required' ? 'consent_required' : json.mode === 'guest' ? 'guest' : 'account';

    return {
      mode,
      items: mode === 'account' ? (json.data ?? []).map(toHistoryEntry) : [],
    };
  } catch {
    // Gangguan jaringan: bukan kesalahan pengguna, cache lokal tetap dipakai.
    return null;
  }
}
