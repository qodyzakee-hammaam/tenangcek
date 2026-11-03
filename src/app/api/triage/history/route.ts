import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/response';
import { requireConsent } from '@/lib/supabase/auth';
import { listTriageSessions } from '@/lib/db/repository/sessions';

export const dynamic = 'force-dynamic';

/**
 * Riwayat pengecekan milik pengguna yang login.
 *
 * - Tamu (`401`): tidak ada riwayat di server; client memakai cache perangkat.
 * - Belum memberi persetujuan: data kesehatan tidak dibaca dari database.
 * - Sudah memberi persetujuan: baris `symptom_sessions` miliknya sendiri,
 *   dijaga RLS lewat `withUserContext`.
 *
 * Respons tidak pernah memuat identitas pengguna, dan log tidak memuat isi gejala.
 */
export async function GET(request: Request) {
  const auth = await requireConsent(request);

  if (!auth.ok) {
    if (auth.status === 401) {
      return NextResponse.json({ success: true, mode: 'guest', data: [] });
    }

    if (auth.error.code === 'consent_required') {
      return NextResponse.json({ success: true, mode: 'consent_required', data: [] });
    }

    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  try {
    const items = await listTriageSessions(auth.userId);
    return NextResponse.json({ success: true, mode: 'account', data: items });
  } catch {
    return errorResponse(
      500,
      'history_load_failed',
      'Riwayat belum bisa dimuat. Coba lagi sebentar lagi.'
    );
  }
}
