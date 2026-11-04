import { withUserContext } from '@/lib/db/withUserContext';
import type { DiaryEntry } from '@/types/user';

/**
 * Diary gejala (docs/database.md §3.4).
 *
 * Mode tamu tidak pernah menyentuh file ini: route mengembalikan `mode: "guest"`
 * dan client menyimpan catatan di perangkatnya.
 */

const SELECT = {
  id: true,
  userId: true,
  sessionId: true,
  note: true,
  severity: true,
  mood: true,
  createdAt: true,
} as const;

type SelectedDiary = {
  id: string;
  userId: string;
  sessionId: string | null;
  note: string;
  severity: number | null;
  mood: number | null;
  createdAt: Date;
};

export const DIARY_PAGE_SIZE = 200;

function toEntry(row: SelectedDiary): DiaryEntry {
  return {
    id: row.id,
    user_id: row.userId,
    session_id: row.sessionId,
    note: row.note,
    severity: row.severity,
    mood: row.mood,
    created_at: row.createdAt.toISOString(),
  };
}

export async function listDiary(userId: string): Promise<DiaryEntry[]> {
  return withUserContext(userId, async (tx) => {
    const rows = await tx.diaryEntry.findMany({
      where: { userId },
      select: SELECT,
      orderBy: { createdAt: 'desc' },
      take: DIARY_PAGE_SIZE,
    });

    return rows.map(toEntry);
  });
}

export async function createDiary(
  userId: string,
  input: { note: string; severity: number | null; mood: number | null; sessionId: string | null }
): Promise<DiaryEntry> {
  return withUserContext(userId, async (tx) => {
    const row = await tx.diaryEntry.create({
      data: {
        userId,
        sessionId: input.sessionId,
        note: input.note,
        severity: input.severity,
        mood: input.mood,
      },
      select: SELECT,
    });

    return toEntry(row);
  });
}

/** Menghapus data sendiri tidak memerlukan persetujuan (docs/database.md §6). */
export async function deleteDiary(userId: string, id: string): Promise<boolean> {
  return withUserContext(userId, async (tx) => {
    const deleted = await tx.diaryEntry.deleteMany({ where: { id, userId } });
    return deleted.count > 0;
  });
}

/**
 * Menghapus seluruh diary milik pengguna.
 * `deleteMany` dengan `userId` menjaga batas kepemilikan; RLS tetap aktif.
 */
export async function deleteAllDiary(userId: string): Promise<number> {
  return withUserContext(userId, async (tx) => {
    const deleted = await tx.diaryEntry.deleteMany({ where: { userId } });
    return deleted.count;
  });
}
