import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Next.js membaca .env.local, sedangkan Prisma CLI tidak. Muat eksplisit agar
// DATABASE_URL/DIRECT_URL yang sama dipakai oleh app dan perintah Prisma.
loadEnv({ path: '.env.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Konfigurasi ini hanya dipakai Prisma CLI (db pull/studio/migrate).
    // Koneksi langsung lebih andal untuk introspeksi daripada pooler pgbouncer.
    // Runtime aplikasi memakai DATABASE_URL lewat driver adapter di
    // src/lib/db/prisma.ts.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
