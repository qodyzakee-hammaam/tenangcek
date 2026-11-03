import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/response';
import { authenticateRequest, requireConsent } from '@/lib/supabase/auth';
import { createDiary, deleteDiary, listDiary } from '@/lib/db/repository/diary';

export const dynamic = 'force-dynamic';

/**
 * Diary gejala (docs/database.md §3.4, §6).
 * - Guest: tidak menulis ke database; route mengembalikan mode 'guest' dan
 *   client menyimpan catatan di sessionStorage.
 * - Login tanpa persetujuan: hanya boleh membaca & menghapus.
 * - Tulis (POST) wajib persetujuan data kesehatan dan dicek di server.
 */

const MAX_NOTE_LENGTH = 2000;

function isRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) {
    // Tamu tetap bisa memakai diary di perangkatnya tanpa menulis ke database.
    if (auth.status === 401) {
      return NextResponse.json({ success: true, data: [], mode: 'guest' });
    }
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  try {
    const entries = await listDiary(auth.userId);
    return NextResponse.json({ success: true, mode: 'account', data: entries });
  } catch {
    return errorResponse(
      500,
      'diary_load_failed',
      'Catatan belum bisa dimuat. Coba lagi sebentar lagi.'
    );
  }
}

export async function POST(request: Request) {
  // Persetujuan diperiksa sebelum body dibaca, agar tidak ada data kesehatan
  // yang diproses bila izin belum ada.
  const auth = await requireConsent(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Catatan belum bisa dibaca. Coba lagi.');
  }

  const payload = body as {
    note?: unknown;
    severity?: unknown;
    mood?: unknown;
    sessionId?: unknown;
  };

  const note = typeof payload.note === 'string' ? payload.note.trim() : '';
  if (note.length === 0 || note.length > MAX_NOTE_LENGTH) {
    return errorResponse(
      400,
      'invalid_note',
      'Tulis catatan singkat (1–2000 karakter) supaya bisa disimpan.'
    );
  }

  if (payload.severity !== undefined && payload.severity !== null && !isRating(payload.severity)) {
    return errorResponse(400, 'invalid_severity', 'Tingkat keparahan harus 1 sampai 5.');
  }

  if (payload.mood !== undefined && payload.mood !== null && !isRating(payload.mood)) {
    return errorResponse(400, 'invalid_mood', 'Skala suasana hati harus 1 sampai 5.');
  }

  const sessionId =
    typeof payload.sessionId === 'string' && payload.sessionId.length > 0
      ? payload.sessionId
      : null;

  try {
    const entry = await createDiary(auth.userId, {
      note,
      severity: isRating(payload.severity) ? payload.severity : null,
      mood: isRating(payload.mood) ? payload.mood : null,
      sessionId,
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch {
    return errorResponse(
      500,
      'diary_save_failed',
      'Catatan belum tersimpan. Coba lagi, atau periksa koneksimu.'
    );
  }
}

export async function DELETE(request: Request) {
  // Menghapus data sendiri tidak memerlukan persetujuan (docs/database.md §6).
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return errorResponse(400, 'missing_id', 'Catatan yang ingin dihapus belum dipilih.');
  }

  try {
    const deleted = await deleteDiary(auth.userId, id);
    if (!deleted) {
      // Bisa berarti id tidak ada atau milik pengguna lain; keduanya tidak
      // dibedakan supaya tidak membocorkan keberadaan data orang lain.
      return errorResponse(404, 'not_found', 'Catatan itu tidak ditemukan.');
    }
    return NextResponse.json({ success: true });
  } catch {
    return errorResponse(500, 'diary_delete_failed', 'Catatan belum bisa dihapus. Coba lagi.');
  }
}
