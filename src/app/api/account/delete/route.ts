import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { errorResponse } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/auth';
import { deleteAllUserData } from '@/lib/db/repository/account';

export const dynamic = 'force-dynamic';

/**
 * Hapus akun (docs/database.md §6).
 *
 * Dua langkah, keduanya wajib berhasil:
 * 1. Hapus data kesehatan lewat Prisma (eksplisit, dengan RLS).
 * 2. Hapus akun login lewat `auth.admin.deleteUser` (service_role, hanya server).
 */
export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return errorResponse(
      503,
      'service_unavailable',
      'Penghapusan akun belum bisa diproses sekarang. Coba lagi nanti.'
    );
  }

  try {
    await deleteAllUserData(auth.userId);
  } catch {
    return errorResponse(500, 'account_delete_failed', 'Akun belum bisa dihapus. Coba lagi nanti.');
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await admin.auth.admin.deleteUser(auth.userId);

  if (error) {
    return errorResponse(500, 'account_delete_failed', 'Akun belum bisa dihapus. Coba lagi nanti.');
  }

  return NextResponse.json({ success: true });
}
