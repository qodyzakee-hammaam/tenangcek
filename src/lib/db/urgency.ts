import type { UrgencyLevel } from '@/types/triage';
import type { UrgencyLevelDb } from '@/types/database';

/**
 * Pemetaan enum urgensi antara UI dan database.
 *
 * UI memakai istilah Indonesia (`src/types/triage.ts`), sedangkan enum database
 * mengikuti docs/database.md §4 (`monitor` / `scheduled` / `urgent` / `emergency`).
 * Semua konversi harus lewat file ini agar tidak ada nilai yang tertukar.
 */

const UI_TO_DB: Record<UrgencyLevel, UrgencyLevelDb> = {
  darurat: 'emergency',
  segera: 'urgent',
  terjadwal: 'scheduled',
  pantau_di_rumah: 'monitor',
};

const DB_TO_UI: Record<UrgencyLevelDb, UrgencyLevel> = {
  emergency: 'darurat',
  urgent: 'segera',
  scheduled: 'terjadwal',
  monitor: 'pantau_di_rumah',
};

/** Ranking kanonik untuk audit safety layer (semakin tinggi semakin kritis). */
const DB_RANK: Record<UrgencyLevelDb, number> = {
  monitor: 1,
  scheduled: 2,
  urgent: 3,
  emergency: 4,
};

export function toDbUrgency(level: UrgencyLevel): UrgencyLevelDb {
  return UI_TO_DB[level];
}

export function fromDbUrgency(level: UrgencyLevelDb): UrgencyLevel {
  return DB_TO_UI[level];
}

export function urgencyRank(level: UrgencyLevelDb): number {
  return DB_RANK[level];
}

/** Nilai tertinggi dari dua level (dipakai untuk audit `final >= rule_floor`). */
export function maxDbUrgency(a: UrgencyLevelDb, b: UrgencyLevelDb): UrgencyLevelDb {
  return urgencyRank(a) >= urgencyRank(b) ? a : b;
}
