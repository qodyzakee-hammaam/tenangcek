-- =========================================================================
-- Bagian yang TIDAK bisa dimodelkan Prisma: foreign key ke auth.users,
-- fungsi, trigger, RLS, dan grant. Semua ditulis tangan.
--
-- Catatan: `prisma migrate diff` melihat FK sebagai objek asing. Jika nanti
-- membuat migrasi baru dengan `prisma migrate dev --create-only`, hapus baris
-- `DROP CONSTRAINT ..._fkey` sebelum migrasi dijalankan.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. Stub `auth` untuk shadow database.
--
-- `prisma migrate dev` memutar ulang migrasi di shadow database kosong yang
-- tidak punya skema `auth` milik Supabase. Tanpa stub ini migrasi gagal dengan
-- "schema auth does not exist". Di Supabase asli blok ini tidak melakukan
-- apa pun karena `auth` sudah ada. Stub TIDAK menyentuh objek yang sudah ada.
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;

    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      email text
    );

    -- Placeholder: di Supabase, auth.uid() membaca request.jwt.claims.
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS 'select null::uuid';
  END IF;
END
$$;

-- -------------------------------------------------------------------------
-- 1. Integritas relasi ke auth.users
--
-- TIDAK memakai foreign key ke auth.users. FK lintas skema membuat Prisma
-- menolak seluruh skema (P4002: "Cross schema references are only allowed
-- when the target schema is listed in the schemas property"), sehingga
-- `prisma migrate dev`/`migrate diff` tidak bisa dipakai sama sekali.
-- Sebagai gantinya, penghapusan akun dijamin oleh trigger di bagian 3
-- (`on_auth_user_deleted`) + penghapusan eksplisit di aplikasi
-- (`deleteAllUserData`). Integritas saat insert sudah dijamin RLS:
-- user_id wajib sama dengan auth.uid(), yang berasal dari token valid.
-- -------------------------------------------------------------------------

-- -------------------------------------------------------------------------
-- 2. Fungsi bantu
-- -------------------------------------------------------------------------

-- updated_at otomatis.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- consent_at hanya diisi server/database, tidak bisa dipalsukan client.
CREATE OR REPLACE FUNCTION public.sync_consent_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT new.consent_health_data THEN
    -- Izin dicabut: waktu persetujuan dikosongkan.
    new.consent_at = NULL;
  ELSIF tg_op = 'INSERT' THEN
    new.consent_at = now();
  ELSIF coalesce(old.consent_health_data, false) = false THEN
    -- Baru diberikan: catat waktunya dari server, bukan dari client.
    new.consent_at = now();
  ELSE
    -- Tetap aktif: pertahankan waktu persetujuan sebelumnya.
    new.consent_at = old.consent_at;
  END IF;

  RETURN new;
END;
$$;

-- Profil otomatis saat pengguna baru mendaftar.
-- consent_health_data sengaja dibiarkan false (opt-in eksplisit).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Hapus seluruh data kesehatan saat akun dihapus, termasuk bila akun dihapus
-- di luar aplikasi (mis. dari dashboard Supabase). Ini pengganti
-- `ON DELETE CASCADE` karena FK lintas skema tidak dipakai.
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.diary_entries WHERE user_id = old.id;
  DELETE FROM public.checkins WHERE user_id = old.id;
  DELETE FROM public.symptom_sessions WHERE user_id = old.id;
  DELETE FROM public.profiles WHERE id = old.id;

  RETURN old;
END;
$$;

-- -------------------------------------------------------------------------
-- 3. Trigger
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_sync_consent_at ON public.profiles;
CREATE TRIGGER profiles_sync_consent_at
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_consent_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- -------------------------------------------------------------------------
-- 4. Row Level Security
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Guest (anon) tidak punya akses tabel sama sekali (docs/database.md §1.3).
-- service_role hanya diberi usage skema, tanpa hak tabel: operasi admin
-- (hapus akun) memakai Supabase Auth, bukan PostgREST.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.symptom_sessions FROM anon;
REVOKE ALL ON TABLE public.checkins FROM anon;
REVOKE ALL ON TABLE public.diary_entries FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.symptom_sessions,
  public.checkins,
  public.diary_entries
TO authenticated;

-- profiles: kunci = id
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- symptom_sessions: kunci = user_id
DROP POLICY IF EXISTS sessions_select_own ON public.symptom_sessions;
CREATE POLICY sessions_select_own ON public.symptom_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_insert_own ON public.symptom_sessions;
CREATE POLICY sessions_insert_own ON public.symptom_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_update_own ON public.symptom_sessions;
CREATE POLICY sessions_update_own ON public.symptom_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_delete_own ON public.symptom_sessions;
CREATE POLICY sessions_delete_own ON public.symptom_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- checkins: kunci = user_id + session_id harus milik pengguna yang sama
DROP POLICY IF EXISTS checkins_select_own ON public.checkins;
CREATE POLICY checkins_select_own ON public.checkins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS checkins_insert_own ON public.checkins;
CREATE POLICY checkins_insert_own ON public.checkins
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      session_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.symptom_sessions s
        WHERE s.id = session_id AND s.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS checkins_update_own ON public.checkins;
CREATE POLICY checkins_update_own ON public.checkins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      session_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.symptom_sessions s
        WHERE s.id = session_id AND s.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS checkins_delete_own ON public.checkins;
CREATE POLICY checkins_delete_own ON public.checkins
  FOR DELETE USING (auth.uid() = user_id);

-- diary_entries: kunci = user_id + session_id harus milik pengguna yang sama
DROP POLICY IF EXISTS diary_select_own ON public.diary_entries;
CREATE POLICY diary_select_own ON public.diary_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS diary_insert_own ON public.diary_entries;
CREATE POLICY diary_insert_own ON public.diary_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      session_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.symptom_sessions s
        WHERE s.id = session_id AND s.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS diary_update_own ON public.diary_entries;
CREATE POLICY diary_update_own ON public.diary_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      session_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.symptom_sessions s
        WHERE s.id = session_id AND s.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS diary_delete_own ON public.diary_entries;
CREATE POLICY diary_delete_own ON public.diary_entries
  FOR DELETE USING (auth.uid() = user_id);
