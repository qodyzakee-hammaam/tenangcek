# database.md — TenangCek

> Dokumen ini menjawab: **bagaimana data disimpan dan saling berhubungan.**
> Platform: **Supabase (Postgres + Auth)** dengan **Row Level Security (RLS)** di semua tabel.

---

## 1. Prinsip Data

1. **Opt-in & minimal.** Hanya simpan data yang meningkatkan relevansi saran.
2. **Persetujuan eksplisit** sebelum menyimpan data sensitif (kesehatan, mood).
3. **Guest tidak menulis ke DB.** Mode tanpa akun tetap berfungsi penuh.
4. **Hapus kapan saja.** Penghapusan akun menghapus seluruh data terkait (lewat trigger dan `deleteAllUserData`).
5. **Isolasi per pengguna.** RLS: pengguna hanya bisa membaca/menulis datanya sendiri.
6. Field sensitif **opsional** (`sex`, `conditions`, `allergies`, `budget_pref`).

---

## 2. Relasi Antar Tabel (ERD)

```text
auth.users (Supabase)
   │ 1
   ├──── 1 ──── profiles            (id = auth.users.id)
   │
   ├──── N ──── checkins            (anxiety_before / anxiety_after)
   │
   ├──── N ──── symptom_sessions ──── 1 ──── N ──── diary_entries
   │                                  (diary_entries.session_id, opsional)
   └──── N ──── diary_entries
```

- `profiles` 1:1 dengan `auth.users`.
- `symptom_sessions` milik satu pengguna; satu sesi bisa punya banyak `diary_entries` (opsional).
- `checkins` dapat dikaitkan ke sesi lewat `session_id` agar selisih kecemasan sebelum/sesudah dapat dianalisis per sesi. Relasi ini opsional: check-in tetap sah tanpa sesi.

---

## 3. Tabel

### 3.1 `profiles`

| Kolom                       | Tipe             | Catatan                                                          |
| --------------------------- | ---------------- | ---------------------------------------------------------------- |
| `id`                        | uuid PK          | = `auth.users.id`; tanpa FK lintas skema, dibersihkan trigger `handle_deleted_user` |
| `age_range`                 | text             | mis. `'15-19'`, `'20-24'`, `'25-34'`, `'35+'`                    |
| `sex`                       | text null        | opsional: `'female'`, `'male'`, `'other'`, `'prefer_not'`        |
| `conditions`                | text[]           | penyakit kronis, kehamilan (opsional)                            |
| `allergies`                 | text[]           | opsional                                                         |
| `tone_pref`                 | text             | `'casual'` \| `'formal'`                                         |
| `detail_pref`               | text             | `'brief'` \| `'detailed'`                                        |
| `region`                    | text null        | kota/area                                                        |
| `uses_bpjs`                 | boolean          | default `false`                                                  |
| `budget_pref`               | text null        | opsional: `'low'`, `'medium'`, `'flexible'`                      |
| `consent_health_data`       | boolean          | Persetujuan menyimpan data kesehatan; default `false` (opt-in)   |
| `consent_at`                | timestamptz null | Waktu persetujuan, diisi trigger `sync_consent_at`               |
| `created_at` / `updated_at` | timestamptz      | default `now()`                                                  |

### 3.2 `checkins`

| Kolom            | Tipe                              | Catatan                                          |
| ---------------- | --------------------------------- | ------------------------------------------------ |
| `id`             | uuid PK                           |                                                  |
| `user_id`        | uuid                              | Mengacu `auth.users.id`; tanpa FK, dibersihkan trigger           |
| `session_id`     | uuid FK null → `symptom_sessions` | Opsional; `ON DELETE SET NULL`                   |
| `anxiety_before` | smallint                          | CHECK 1–5                                        |
| `anxiety_after`  | smallint null                     | CHECK 1–5; diisi setelah hasil                   |
| `created_at`     | timestamptz                       | default `now()`                                  |

### 3.3 `symptom_sessions`

| Kolom                | Tipe                      | Catatan                                                    |
| -------------------- | ------------------------- | ---------------------------------------------------------- |
| `id`                 | uuid PK                   |                                                            |
| `user_id`            | uuid                      | Mengacu `auth.users.id`; tanpa FK, dibersihkan trigger     |
| `symptoms`           | jsonb                     | gejala utama, durasi, keparahan, gejala penyerta           |
| `answers`            | jsonb                     | jawaban pertanyaan lanjutan                                |
| `urgency_level`      | enum `urgency_level`      | `emergency` / `urgent` / `scheduled` / `monitor`           |
| `reasoning`          | text                      | alasan singkat hasil                                       |
| `next_steps`         | jsonb                     | array langkah (maks. 3)                                    |
| `rule_floor`         | enum `urgency_level` null | Batas bawah dari rule, untuk audit safety layer            |
| `red_flag_triggered` | boolean                   | Penanda red flag; default `false`                          |
| `result`             | jsonb null                | Detail hasil lain (penyebab umum, tanda bahaya, ringkasan dokter, calm support) |
| `created_at`         | timestamptz               | default `now()`                                            |

> `rule_floor` disimpan terpisah dari `urgency_level` agar audit `final_urgency >= rule_floor` bisa dilakukan tanpa menghitung ulang output AI. Teks bebas yang menunjukkan tanda krisis tidak disimpan; hanya penanda `red_flag_triggered` bila relevan.

### 3.4 `diary_entries`

| Kolom        | Tipe                              | Catatan              |
| ------------ | --------------------------------- | -------------------- |
| `id`         | uuid PK                           |                      |
| `user_id`    | uuid                              | Mengacu `auth.users.id`; tanpa FK, dibersihkan trigger |
| `session_id` | uuid FK null → `symptom_sessions` | `ON DELETE SET NULL` |
| `note`       | text                              | catatan gejala       |
| `severity`   | smallint null                     | CHECK 1–5            |
| `mood`       | smallint null                     | CHECK 1–5            |
| `created_at` | timestamptz                       | default `now()`      |

---

## 4. SQL Migrasi (referensi)

> Sumber kebenaran DDL adalah `prisma/schema.prisma` + `prisma/migrations/`. Potongan di bawah adalah ringkasan yang mudah dibaca; migrasi asli juga memuat CHECK, trigger, RLS, dan grant.

```sql
-- Enum urgensi
create type urgency_level as enum ('monitor', 'scheduled', 'urgent', 'emergency');

-- profiles
create table public.profiles (
  id uuid primary key,  -- = auth.users.id; tanpa FK (lihat §11 "Kenapa tidak ada FK ke auth.users")
  age_range text,
  sex text,
  conditions text[] default '{}',
  allergies text[] default '{}',
  tone_pref text not null default 'casual' check (tone_pref in ('casual','formal')),
  detail_pref text not null default 'brief' check (detail_pref in ('brief','detailed')),
  region text,
  uses_bpjs boolean not null default false,
  budget_pref text,
  consent_health_data boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- symptom_sessions
create table public.symptom_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,  -- = auth.users.id; tanpa FK
  symptoms jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  urgency_level urgency_level not null,
  reasoning text not null,
  next_steps jsonb not null default '[]'::jsonb,
  rule_floor urgency_level,
  red_flag_triggered boolean not null default false,
  result jsonb,
  created_at timestamptz not null default now()
);
create index on public.symptom_sessions (user_id, created_at desc);

-- checkins
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,  -- = auth.users.id; tanpa FK
  session_id uuid references public.symptom_sessions(id) on delete set null,
  anxiety_before smallint not null check (anxiety_before between 1 and 5),
  anxiety_after smallint check (anxiety_after between 1 and 5),
  created_at timestamptz not null default now()
);
create index on public.checkins (user_id, created_at desc);

-- diary_entries
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,  -- = auth.users.id; tanpa FK
  session_id uuid references public.symptom_sessions(id) on delete set null,
  note text not null,
  severity smallint check (severity between 1 and 5),
  mood smallint check (mood between 1 and 5),
  created_at timestamptz not null default now()
);
create index on public.diary_entries (user_id, created_at desc);
```

---

## 5. Row Level Security

Aktifkan RLS di **semua** tabel. Kebijakan: pengguna hanya mengakses baris miliknya.

```sql
alter table public.profiles          enable row level security;
alter table public.symptom_sessions  enable row level security;
alter table public.checkins          enable row level security;
alter table public.diary_entries     enable row level security;

-- profiles: kunci = id
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Tabel lain: kunci = user_id (ulangi untuk symptom_sessions, checkins, diary_entries)
create policy "sessions_select_own" on public.symptom_sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.symptom_sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.symptom_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_delete_own" on public.symptom_sessions
  for delete using (auth.uid() = user_id);

-- (checkins_* dan diary_*: pola identik)
```

Catatan:

- Tidak ada kebijakan akses publik atau lintas pengguna. Role `anon` tidak diberi akses tabel sama sekali.
- `checkins` dan `diary_entries` sudah memakai pengecekan `session_id` milik pengguna yang sama pada `INSERT` dan `UPDATE` (lihat `20261103120100_rls_triggers`).
- Total ada **16 policy** (4 per tabel) dan grant `SELECT, INSERT, UPDATE, DELETE` hanya untuk role `authenticated`.
- `service_role` hanya diberi usage skema, tanpa hak tabel; operasi admin (hapus akun) memakai Supabase Auth dan tidak lewat PostgREST.

---

## 6. Persetujuan, Retensi & Penghapusan

| Hal            | Aturan                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Persetujuan    | Tulis ke `symptom_sessions`, `checkins`, `diary_entries` hanya bila `profiles.consent_health_data = true` (dicek di server lewat `requireConsent`) |
| Hapus data     | `DELETE /api/account/delete`: hapus data kesehatan lewat Prisma, lalu hapus `auth.users` (trigger juga membersihkan data bila akun dihapus dari dashboard Supabase) |
| Hapus sebagian | Pengguna dapat menghapus entri diary satu per satu (`DELETE /api/diary?id=...`). Riwayat triage belum punya tombol hapus per sesi            |
| Retensi        | Belum ada kedaluwarsa otomatis; data tersimpan sampai pengguna menghapusnya. Kebijakan retensi final perlu ditulis di halaman privasi        |
| Guest          | Riwayat triage di `localStorage`, diary di `sessionStorage`; tidak ada tulis DB. Riwayat tamu bertahan sampai dibersihkan; diary hilang saat tab ditutup |

---

## 7. Data Terkait Krisis & Red Flag

Saat ini aplikasi **tidak mendeteksi teks krisis mental secara otomatis**. Halaman `/crisis` adalah layar statis berisi kontak bantuan, ditautkan dari Navbar, Footer, dan `RedFlagAlert`. Yang disimpan dari alur triage hanyalah penanda `red_flag_triggered` untuk gejala fisik yang cocok dengan aturan `redFlags.ts`.

Prinsip penyimpanan:

- Jangan menyimpan teks mentah yang memicu kekhawatiran krisis; cukup penanda bila memang perlu untuk riwayat.
- Jangan menulis isi gejala atau percakapan ke log aplikasi.
- Bila nanti ditambahkan deteksi krisis otomatis, alur tersebut harus memutus percakapan biasa dan tidak mengirim teks sensitif ke Gemini.

---

## 8. Query Umum

| Kebutuhan                                                        | Pendekatan                                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Riwayat gejala untuk deteksi pola ("sudah 3 hari tidak membaik") | `select` dari `symptom_sessions` by `user_id`, urut `created_at desc`, batasi N terakhir           |
| Perubahan kecemasan                                              | `anxiety_after - anxiety_before` per baris `checkins`                                              |
| Diary harian                                                     | `select` dari `diary_entries` per rentang tanggal                                                  |
| Pengingat eskalasi (rencana)                                     | Hitung hari sejak sesi terakhir dengan `urgency_level >= scheduled` tanpa entri diary yang membaik |

### 8.1 Endpoint riwayat

| Endpoint                                    | Method | Perilaku                                                                                                              |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/triage/history/route.ts`       | `GET`  | `requireConsent`; tamu → `mode: "guest"`, belum consent → `mode: "consent_required"`, selain itu `mode: "account"` (maks. 20 sesi terbaru) |
| `src/app/api/triage/history/import/route.ts`| `POST` | Impor maks. 20 entri dari cache perangkat; **wajib** persetujuan (`requireConsent`)                                   |

Catatan impor dari perangkat:

- `answers` diisi `{ importedFromDevice: true }`, `rule_floor` = `NULL`, `next_steps` = `[]`.
- `red_flag_triggered` = `true` hanya bila urgensi `emergency` — konservatif, karena penanda asli tidak tersedia di cache.
- `urgency_level` disimpan **apa adanya**; tidak ada penurunan level.
- `created_at` mengikuti waktu di perangkat, tetapi tidak boleh di masa depan.
- Setelah berhasil, entri tersebut dihapus dari cache tamu di browser agar tidak menumpuk.

---

## 9. Type TypeScript

Tipe database berada di `src/types/database.ts` dan ditulis manual mengikuti `prisma/schema.prisma` serta migrasi. `src/generated/prisma/` dihasilkan oleh `prisma generate` dan tidak boleh diedit.

Setelah mengubah skema, jalankan:

```bash
npm run prisma:generate
npx tsc --noEmit
```

`supabase gen types` tidak dipakai karena akses data tidak lewat PostgREST, melainkan Prisma + `withUserContext`.

---

## 10. Implementasi di Repo Ini

| Hal | Lokasi |
| --- | --- |
| Skema (sumber kebenaran) | `prisma/schema.prisma` |
| Migrasi (DDL + RLS + trigger) | `prisma/migrations/` |
| Konfigurasi Prisma CLI | `prisma.config.ts` (memuat `.env.local`) |
| Prisma Client (server-only) | `src/lib/db/prisma.ts` |
| Konteks pengguna + RLS | `src/lib/db/withUserContext.ts` |
| Repository data | `src/lib/db/repository/{profiles,sessions,checkins,diary,account}.ts` |
| Tipe database | `src/types/database.ts` (ditulis manual; sesuaikan saat skema berubah) |
| Pemetaan enum UI ↔ DB | `src/lib/db/urgency.ts` |
| Gerbang persetujuan server | `src/lib/supabase/auth.ts` (`requireConsent`) |
| Endpoint | `POST /api/triage`, `GET /api/triage/history`, `POST /api/triage/history/import`, `GET/POST/DELETE /api/diary`, `POST/PATCH /api/checkins`, `GET/PATCH /api/profile/consent`, `DELETE /api/account/delete` |
| Smoke test DB | `scripts/smoke-db.cjs` (`npm run test:smoke`) |

Catatan implementasi:

- Enum di database memakai istilah Inggris (`monitor`/`scheduled`/`urgent`/`emergency`); UI tetap memakai istilah Indonesia. Konversi hanya lewat `src/lib/db/urgency.ts`.
- Sesi Supabase disimpan di `localStorage`, sehingga Route Handler menerima access token lewat header `Authorization: Bearer <token>`. Client yang menulis data wajib mengirim header ini.
- `consent_at` diisi oleh trigger `sync_consent_at`, bukan oleh client.
- Mode tamu: `/api/diary` mengembalikan `mode: "guest"` dan client menyimpan catatan di `sessionStorage`; `/api/triage/history` mengembalikan `mode: "guest"` dan riwayat tamu dibaca dari `localStorage`. Tidak ada tulis DB.
- Semua skema hanya ada di folder `prisma/`; tidak ada folder `supabase/` atau `supabase/schema.sql` yang menjadi sumber kedua.

---

## 11. Prisma ORM

**Prisma adalah sumber kebenaran skema.** Semua DDL ada di `prisma/migrations/`
dan dijalankan dengan Prisma Migrate.

```bash
npm run db:migrate   # prisma migrate dev  — buat + terapkan migrasi (dev)
npm run db:deploy    # prisma migrate deploy — terapkan migrasi yang ada
npm run db:status    # prisma migrate status
```

### Migrasi yang ada

| Migrasi | Isi |
| --- | --- |
| `20261103120000_init` | enum, tabel, index, FK `session_id` (hasil generate) + CHECK constraint (tulis tangan) |
| `20261103120100_rls_triggers` | stub `auth` untuk shadow DB, fungsi, trigger, RLS, policy, grant |

### Bagian yang ditulis tangan (tidak bisa dimodelkan Prisma)

- `CHECK` constraint (`sex`, `tone_pref`, `detail_pref`, `budget_pref`, rentang 1–5, panjang catatan).
- `ENABLE ROW LEVEL SECURITY`, 16 policy, `GRANT`/`REVOKE`.
- Fungsi & trigger: `set_updated_at`, `sync_consent_at`, `handle_new_user`, `handle_deleted_user`.
- Stub skema `auth` (lihat di bawah).

Prisma tidak mengenali objek-objek ini, jadi migrasi otomatis tidak akan
menghapusnya. Tetap periksa SQL hasil generate sebelum apply
(`prisma migrate dev --create-only`).

### Kenapa tidak ada FK ke `auth.users`

Foreign key lintas skema membuat Prisma menolak seluruh skema
(`P4002: Cross schema references are only allowed when the target schema is
listed in the schemas property`), sehingga `prisma migrate dev` tidak bisa
dipakai sama sekali. Karena itu relasi ke `auth.users` diganti:

- **Hapus akun:** trigger `on_auth_user_deleted` (`handle_deleted_user`) menghapus
  `diary_entries`, `checkins`, `symptom_sessions`, `profiles` milik user tersebut,
  termasuk bila akun dihapus dari dashboard Supabase. Aplikasi juga menghapus
  eksplisit lewat `deleteAllUserData` sebelum `auth.admin.deleteUser`.
- **Integritas saat insert:** RLS mewajibkan `user_id = auth.uid()`, dan
  `auth.uid()` berasal dari token yang valid — user pasti ada.

Relasi `checkins.session_id` / `diary_entries.session_id` ke `symptom_sessions`
tetap berupa FK biasa (`ON DELETE SET NULL`) dan dikelola Prisma.

### Shadow database

`prisma migrate dev` memutar ulang migrasi di shadow database kosong yang tidak
punya skema `auth`. Migrasi kedua membuat stub minimal (`auth.users(id, email)`
dan `auth.uid()`), yang **tidak melakukan apa pun di Supabase** karena `auth`
sudah ada (dibungkus `IF NOT EXISTS`). Tanpa stub ini, replay gagal dengan
`schema "auth" does not exist`.

### RLS tetap berlaku di bawah Prisma

Prisma terhubung sebagai owner database yang melewati RLS. Semua akses data
pengguna karena itu wajib lewat `withUserContext(userId, fn)` yang:

1. mengisi `request.jwt.claims` (`sub` = user id) secara transaksi-lokal, lalu
2. menjalankan `set local role authenticated`.

Dengan begitu `auth.uid()` di policy mengembalikan id pengguna dan baris
pengguna lain tidak pernah terlihat. Jangan memakai `prisma` langsung dari Route
Handler untuk data pengguna.

Prisma 7 membutuhkan driver adapter: aplikasi memakai `DATABASE_URL` lewat
`@prisma/adapter-pg` di `src/lib/db/prisma.ts`, sedangkan Prisma CLI memakai
`DIRECT_URL` (lihat `prisma.config.ts`).



