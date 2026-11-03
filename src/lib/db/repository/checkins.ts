import { withUserContext } from '@/lib/db/withUserContext';

/**
 * Check-in kecemasan (docs/database.md §3.2).
 * Hanya menyimpan angka 1–5; tidak ada teks bebas.
 */

export interface CheckinRow {
  id: string;
  session_id: string | null;
  anxiety_before: number;
  anxiety_after: number | null;
  created_at: string;
}

type SelectedCheckin = {
  id: string;
  sessionId: string | null;
  anxietyBefore: number;
  anxietyAfter: number | null;
  createdAt: Date;
};

function toRow(row: SelectedCheckin): CheckinRow {
  return {
    id: row.id,
    session_id: row.sessionId,
    anxiety_before: row.anxietyBefore,
    anxiety_after: row.anxietyAfter,
    created_at: row.createdAt.toISOString(),
  };
}

const SELECT = {
  id: true,
  sessionId: true,
  anxietyBefore: true,
  anxietyAfter: true,
  createdAt: true,
} as const;

export async function createCheckin(
  userId: string,
  input: { sessionId: string | null; anxietyBefore: number; anxietyAfter: number | null }
): Promise<CheckinRow> {
  return withUserContext(userId, async (tx) => {
    const row = await tx.checkin.create({
      data: {
        userId,
        sessionId: input.sessionId,
        anxietyBefore: input.anxietyBefore,
        anxietyAfter: input.anxietyAfter,
      },
      select: SELECT,
    });

    return toRow(row);
  });
}

/**
 * Perbarui rasa cemas sesudah membaca hasil.
 * Filter `userId` tetap dipasang walau RLS sudah menyaring, sebagai lapisan
 * kedua bila policy berubah di kemudian hari.
 */
export async function updateCheckinAfter(
  userId: string,
  reference: { id: string } | { sessionId: string },
  anxietyAfter: number
): Promise<CheckinRow | null> {
  return withUserContext(userId, async (tx) => {
    const where =
      'id' in reference
        ? { id: reference.id, userId }
        : { sessionId: reference.sessionId, userId };

    const updated = await tx.checkin.updateMany({
      where,
      data: { anxietyAfter },
    });

    if (updated.count === 0) return null;

    const row = await tx.checkin.findFirst({
      where,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return row ? toRow(row) : null;
  });
}
