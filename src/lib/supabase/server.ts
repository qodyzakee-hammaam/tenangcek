import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Supabase Admin Client (service_role).
 *
 * HANYA untuk Route Handler server-side pada operasi yang memang butuh
 * hak istimewa (mis. hapus akun). Jangan pernah mengimpor file ini dari
 * komponen client. Tidak ada fallback ke anon key: jika service_role belum
 * diset, operasi admin harus gagal dengan jelas, bukan berjalan setengah.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin client belum dikonfigurasi.');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
