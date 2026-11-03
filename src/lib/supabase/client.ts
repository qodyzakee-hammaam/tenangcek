import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Supabase Browser Client
 * Digunakan pada komponen client-side untuk auth & query terproteksi RLS.
 *
 * Sengaja memakai URL placeholder saat env belum diisi supaya halaman darurat
 * (mis. /crisis) tetap bisa dirender walau konfigurasi belum lengkap.
 * `isSupabaseConfigured` dipakai untuk menonaktifkan fitur akun dengan tenang.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient<Database>(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/** Header Authorization untuk Route Handler yang membutuhkan sesi pengguna. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
