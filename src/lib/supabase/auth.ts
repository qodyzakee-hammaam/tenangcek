import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { ApiErrorBody } from '@/lib/api/response';
import { getConsent } from '@/lib/db/repository/profiles';

/**
 * Autentikasi & gerbang persetujuan untuk Route Handler.
 *
 * Sesi Supabase disimpan di localStorage (client-side), sehingga Route Handler
 * tidak bisa membaca user dari cookie. Client mengirim access token lewat header
 * `Authorization: Bearer <token>`.
 *
 * Di sini Supabase hanya dipakai untuk **verifikasi identitas** (dan operasi
 * admin seperti hapus akun). Akses data kesehatan memakai Prisma lewat
 * `withUserContext`, yang tetap menegakkan RLS.
 */

type AuthFailure = { ok: false; status: number; error: ApiErrorBody };
type AuthSuccess = {
  ok: true;
  userId: string;
  accessToken: string;
};

export type RequestAuth = AuthSuccess | AuthFailure;
export type ConsentAuth = RequestAuth;

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getAccessToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function createRequestClient(
  url: string,
  anonKey: string,
  accessToken: string
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/** Verifikasi token pengguna tanpa mewajibkan persetujuan data kesehatan. */
export async function authenticateRequest(request: Request): Promise<RequestAuth> {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      error: {
        code: 'unauthenticated',
        message: 'Masuk dulu supaya catatanmu bisa disimpan.',
      },
    };
  }

  const config = getSupabaseConfig();
  if (!config) {
    return {
      ok: false,
      status: 503,
      error: {
        code: 'service_unavailable',
        message: 'Layanan penyimpanan belum siap. Coba lagi nanti.',
      },
    };
  }

  const client = createRequestClient(config.url, config.anonKey, accessToken);
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      error: {
        code: 'unauthenticated',
        message: 'Sesi kamu sudah berakhir. Silakan masuk lagi.',
      },
    };
  }

  return { ok: true, userId: data.user.id, accessToken };
}

/**
 * Gerbang wajib sebelum menulis data kesehatan (docs/database.md §6):
 * tulis ke symptom_sessions / checkins / diary_entries hanya bila
 * profiles.consent_health_data = true.
 */
export async function requireConsent(request: Request): Promise<ConsentAuth> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth;

  let consent: { consentHealthData: boolean } | null;
  try {
    consent = await getConsent(auth.userId);
  } catch {
    return {
      ok: false,
      status: 500,
      error: {
        code: 'consent_check_failed',
        message: 'Kami belum bisa memeriksa izin penyimpanan. Coba lagi sebentar lagi.',
      },
    };
  }

  if (!consent?.consentHealthData) {
    return {
      ok: false,
      status: 403,
      error: {
        code: 'consent_required',
        message:
          'Aktifkan izin penyimpanan data kesehatan dulu supaya catatan ini bisa disimpan.',
      },
    };
  }

  return auth;
}
