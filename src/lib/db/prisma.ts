import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@/generated/prisma/client';

/**
 * Prisma Client (server-only).
 *
 * Jangan pernah mengimpor file ini dari komponen client — file ini memegang
 * kredensial database. Semua akses data kesehatan lewat `src/lib/db/repository`
 * dan `withUserContext` agar RLS tetap berlaku.
 *
 * Prisma 7 mewajibkan driver adapter; kita memakai `pg` (pooler Supabase).
 */
const connectionString = process.env.DATABASE_URL;

function createPrismaClient() {
  if (!connectionString) {
    // Gagal cepat di server, bukan diam-diam memakai database lain.
    throw new Error('DATABASE_URL belum dikonfigurasi.');
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { tenangcekPrisma?: PrismaClient };

/** Reuse koneksi saat dev agar hot reload tidak membuat pool baru terus-menerus. */
export const prisma = globalForPrisma.tenangcekPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.tenangcekPrisma = prisma;
}

export { Prisma };
export type TransactionClient = Prisma.TransactionClient;
