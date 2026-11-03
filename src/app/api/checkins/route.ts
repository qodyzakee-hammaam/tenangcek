import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/response';
import { requireConsent } from '@/lib/supabase/auth';
import { createCheckin, updateCheckinAfter } from '@/lib/db/repository/checkins';

export const dynamic = 'force-dynamic';

/**
 * Check-in kecemasan (docs/database.md §3.2).
 * Semua operasi tulis wajib persetujuan data kesehatan.
 */

function isRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function readSessionId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Simpan check-in baru (sebelum melihat hasil). */
export async function POST(request: Request) {
  const auth = await requireConsent(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Check-in belum bisa dibaca. Coba lagi.');
  }

  const payload = body as { anxietyBefore?: unknown; anxietyAfter?: unknown; sessionId?: unknown };

  if (!isRating(payload.anxietyBefore)) {
    return errorResponse(400, 'invalid_anxiety', 'Pilih angka 1 sampai 5 untuk rasa cemas.');
  }

  if (
    payload.anxietyAfter !== undefined &&
    payload.anxietyAfter !== null &&
    !isRating(payload.anxietyAfter)
  ) {
    return errorResponse(400, 'invalid_anxiety', 'Pilih angka 1 sampai 5 untuk rasa cemas.');
  }

  try {
    const checkin = await createCheckin(auth.userId, {
      sessionId: readSessionId(payload.sessionId),
      anxietyBefore: payload.anxietyBefore,
      anxietyAfter: isRating(payload.anxietyAfter) ? payload.anxietyAfter : null,
    });

    return NextResponse.json({ success: true, data: checkin }, { status: 201 });
  } catch {
    return errorResponse(
      500,
      'checkin_save_failed',
      'Check-in belum tersimpan. Coba lagi sebentar lagi.'
    );
  }
}

/** Perbarui rasa cemas sesudah membaca hasil. */
export async function PATCH(request: Request) {
  const auth = await requireConsent(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Check-in belum bisa dibaca. Coba lagi.');
  }

  const payload = body as { id?: unknown; sessionId?: unknown; anxietyAfter?: unknown };

  if (!isRating(payload.anxietyAfter)) {
    return errorResponse(400, 'invalid_anxiety', 'Pilih angka 1 sampai 5 untuk rasa cemas.');
  }

  const id = typeof payload.id === 'string' && payload.id.length > 0 ? payload.id : null;
  const sessionId = readSessionId(payload.sessionId);

  if (!id && !sessionId) {
    return errorResponse(400, 'missing_reference', 'Check-in yang ingin diperbarui belum dipilih.');
  }

  try {
    const checkin = await updateCheckinAfter(
      auth.userId,
      id ? { id } : { sessionId: sessionId as string },
      payload.anxietyAfter
    );

    if (!checkin) {
      return errorResponse(404, 'not_found', 'Check-in itu tidak ditemukan.');
    }

    return NextResponse.json({ success: true, data: checkin });
  } catch {
    return errorResponse(500, 'checkin_update_failed', 'Check-in belum bisa diperbarui. Coba lagi.');
  }
}
