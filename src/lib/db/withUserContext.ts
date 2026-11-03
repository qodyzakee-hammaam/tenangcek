import { prisma, type TransactionClient } from '@/lib/db/prisma';

/**
 * Menjalankan query sebagai pengguna tertentu dengan RLS tetap aktif.
 *
 * Prisma terhubung sebagai owner database (`postgres`), dan owner melewati RLS.
 * Karena itu setiap akses data pengguna wajib dibungkus helper ini:
 *
 * 1. `request.jwt.claims` diisi `sub` = user id (transaksi-lokal), sehingga
 *    `auth.uid()` di policy Supabase mengembalikan id tersebut.
 * 2. `set local role authenticated` membuat policy RLS benar-benar dievaluasi.
 *
 * Keduanya otomatis kembali ke kondisi awal saat transaksi selesai, jadi tidak
 * ada kebocoran konteks antar-request (penting karena koneksi di-pool).
 */
export async function withUserContext<T>(
  userId: string,
  action: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  // `sub` harus uuid; nilai lain berarti token tidak valid dan tidak boleh
  // dipakai untuk query apa pun.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('User context tidak valid.');
  }

  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRawUnsafe(`select set_config('request.jwt.claims', $1, true)`, claims);
      // Role literal, bukan input pengguna — tidak ada nilai yang diinterpolasi.
      await tx.$executeRawUnsafe(`set local role authenticated`);
      return action(tx);
    },
    { maxWait: 10_000, timeout: 20_000 }
  );
}
