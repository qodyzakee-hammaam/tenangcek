import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/auth';
import { getConsent, setConsent } from '@/lib/db/repository/profiles';

export const dynamic = 'force-dynamic';

/**
 * Persetujuan penyimpanan data kesehatan (docs/database.md §6).
 * `consent_at` diisi oleh trigger database, bukan oleh client.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  try {
    const consent = await getConsent(auth.userId);
    return NextResponse.json({
      success: true,
      data: {
        consentHealthData: consent?.consentHealthData ?? false,
        consentAt: consent?.consentAt ?? null,
      },
    });
  } catch {
    return errorResponse(500, 'consent_load_failed', 'Izin penyimpanan belum bisa dimuat.');
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Permintaan belum bisa dibaca. Coba lagi.');
  }

  const consent = (body as { consent?: unknown }).consent;
  if (typeof consent !== 'boolean') {
    return errorResponse(400, 'invalid_consent', 'Pilihan izin penyimpanan tidak dikenali.');
  }

  try {
    const state = await setConsent(auth.userId, consent);
    return NextResponse.json({
      success: true,
      data: {
        consentHealthData: state.consentHealthData,
        consentAt: state.consentAt,
      },
    });
  } catch {
    return errorResponse(500, 'consent_update_failed', 'Izin penyimpanan belum bisa diperbarui.');
  }
}
