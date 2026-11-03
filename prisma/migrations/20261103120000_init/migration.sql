-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "urgency_level" AS ENUM ('monitor', 'scheduled', 'urgent', 'emergency');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "age_range" TEXT,
    "sex" TEXT,
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tone_pref" TEXT NOT NULL DEFAULT 'casual',
    "detail_pref" TEXT NOT NULL DEFAULT 'brief',
    "region" TEXT,
    "uses_bpjs" BOOLEAN NOT NULL DEFAULT false,
    "budget_pref" TEXT,
    "consent_health_data" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "symptoms" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "urgency_level" "urgency_level" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "next_steps" JSONB NOT NULL DEFAULT '[]',
    "rule_floor" "urgency_level",
    "red_flag_triggered" BOOLEAN NOT NULL DEFAULT false,
    "result" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "session_id" UUID,
    "anxiety_before" SMALLINT NOT NULL,
    "anxiety_after" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "session_id" UUID,
    "note" TEXT NOT NULL,
    "severity" SMALLINT,
    "mood" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "symptom_sessions_user_id_created_at_idx" ON "symptom_sessions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "checkins_user_id_created_at_idx" ON "checkins"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "checkins_session_id_idx" ON "checkins"("session_id");

-- CreateIndex
CREATE INDEX "diary_entries_user_id_created_at_idx" ON "diary_entries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "diary_entries_session_id_idx" ON "diary_entries"("session_id");

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "symptom_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "symptom_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =========================================================================
-- BAGIAN MANUAL — CHECK constraint.
-- Prisma tidak memodelkan CHECK, jadi bagian ini ditulis tangan (tidak akan
-- dihapus oleh migrasi otomatis karena tidak terlihat oleh Prisma).
-- =========================================================================

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_sex_check"
    CHECK ("sex" IN ('female', 'male', 'other', 'prefer_not')),
  ADD CONSTRAINT "profiles_tone_pref_check"
    CHECK ("tone_pref" IN ('casual', 'formal')),
  ADD CONSTRAINT "profiles_detail_pref_check"
    CHECK ("detail_pref" IN ('brief', 'detailed')),
  ADD CONSTRAINT "profiles_budget_pref_check"
    CHECK ("budget_pref" IN ('low', 'medium', 'flexible'));

ALTER TABLE "checkins"
  ADD CONSTRAINT "checkins_anxiety_before_check"
    CHECK ("anxiety_before" BETWEEN 1 AND 5),
  ADD CONSTRAINT "checkins_anxiety_after_check"
    CHECK ("anxiety_after" BETWEEN 1 AND 5);

ALTER TABLE "diary_entries"
  ADD CONSTRAINT "diary_entries_note_length_check"
    CHECK (char_length("note") BETWEEN 1 AND 2000),
  ADD CONSTRAINT "diary_entries_severity_check"
    CHECK ("severity" BETWEEN 1 AND 5),
  ADD CONSTRAINT "diary_entries_mood_check"
    CHECK ("mood" BETWEEN 1 AND 5);

