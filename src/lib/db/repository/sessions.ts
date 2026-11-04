import { Prisma } from '@/lib/db/prisma';
import { withUserContext } from '@/lib/db/withUserContext';
import type { UrgencyLevelDb } from '@/types/database';

/**
 * Penyimpanan sesi triage (docs/database.md §3.3).
 *
 * Catatan keamanan:
 * - `rule_floor` disimpan terpisah dari `urgency_level` agar audit
 *   `final_urgency >= rule_floor` bisa dilakukan tanpa menghitung ulang AI.
 * - Teks pemicu krisis tidak disimpan; hanya penanda `red_flag_triggered`.
 */

export interface SaveTriageInput {
  symptoms: Prisma.InputJsonValue;
  answers: Prisma.InputJsonValue;
  urgencyLevel: UrgencyLevelDb;
  reasoning: string;
  nextSteps: Prisma.InputJsonValue;
  ruleFloor: UrgencyLevelDb | null;
  redFlagTriggered: boolean;
  result: Prisma.InputJsonValue;
  anxietyBefore: number | null;
}

export interface TriageHistoryItem {
  id: string;
  symptomName: string;
  duration: string | null;
  urgencyLevel: UrgencyLevelDb;
  reasoning: string;
  createdAt: string;
  doctorSummary: { summary: string; threeQuestionsForDoctor: string[] } | null;
}

/** Item yang diimpor dari cache perangkat setelah pengguna memberi persetujuan. */
export interface ImportTriageItem {
  symptomName: string;
  duration: string | null;
  urgencyLevel: UrgencyLevelDb;
  reasoning: string;
  createdAt: string;
  doctorSummary: { summary: string; threeQuestionsForDoctor: string[] } | null;
}

export interface SavedTriageSession {
  sessionId: string;
  checkinSaved: boolean;
}

export async function saveTriageSession(
  userId: string,
  input: SaveTriageInput
): Promise<SavedTriageSession> {
  const sessionId = await withUserContext(userId, async (tx) => {
    const session = await tx.symptomSession.create({
      data: {
        userId,
        symptoms: input.symptoms,
        answers: input.answers,
        urgencyLevel: input.urgencyLevel,
        reasoning: input.reasoning,
        nextSteps: input.nextSteps,
        ruleFloor: input.ruleFloor,
        redFlagTriggered: input.redFlagTriggered,
        result: input.result,
      },
      select: { id: true },
    });

    return session.id;
  });

  const anxietyBefore = input.anxietyBefore;
  if (anxietyBefore === null) {
    return { sessionId, checkinSaved: false };
  }

  // Transaksi terpisah: kegagalan check-in tidak boleh membatalkan sesi yang
  // sudah tersimpan (pengguna tetap butuh hasil triage-nya).
  try {
    await withUserContext(userId, async (tx) => {
      await tx.checkin.create({
        data: { userId, sessionId, anxietyBefore },
      });
    });
    return { sessionId, checkinSaved: true };
  } catch {
    return { sessionId, checkinSaved: false };
  }
}

/** Ambil nilai string dari kolom JSON tanpa mempercayai bentuknya. */
function readJsonString(
  value: Prisma.JsonValue | null | undefined,
  key: string
): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const field = (value as Record<string, Prisma.JsonValue>)[key];
  return typeof field === 'string' ? field : null;
}

function readJsonRecord(
  value: Prisma.JsonValue | null | undefined,
  key?: string
): Record<string, Prisma.JsonValue> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, Prisma.JsonValue>;
  if (!key) return record;
  const nested = record[key];
  if (typeof nested !== 'object' || nested === null || Array.isArray(nested)) return null;
  return nested as Record<string, Prisma.JsonValue>;
}

function readDoctorSummary(value: Prisma.JsonValue | null | undefined) {
  const result = readJsonRecord(value);
  const summary = result ? readJsonRecord(result.doctorSummary) : null;
  if (!summary || typeof summary.summary !== 'string') return null;

  return {
    summary: summary.summary,
    threeQuestionsForDoctor: Array.isArray(summary.threeQuestionsForDoctor)
      ? summary.threeQuestionsForDoctor.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

export interface TriageHistoryQuery {
  /** Batas bawah waktu (inklusif). */
  from?: Date;
  /** Batas atas waktu (inklusif). */
  to?: Date;
  /** Filter level urgensi; kosong berarti semua. */
  urgency?: UrgencyLevelDb[];
  /** Cursor: hanya ambil baris yang lebih lama dari waktu ini. */
  before?: Date;
  limit?: number;
}

export interface TriageHistoryPage {
  items: TriageHistoryItem[];
  /** Jumlah seluruh baris yang cocok dengan filter tanggal/urgensi. */
  total: number;
  hasMore: boolean;
  /** Waktu entri terakhir di halaman ini, untuk permintaan berikutnya. */
  nextBefore: string | null;
}

const MAX_HISTORY_LIMIT = 200;

/**
 * Riwayat triage milik pengguna, terbaru lebih dulu.
 * RLS tetap menegakkan isolasi lewat `withUserContext`.
 *
 * Filter tanggal dan urgensi dikerjakan di database. `total` dihitung tanpa
 * cursor agar UI bisa menampilkan jumlah hasil untuk filter yang aktif.
 */
export async function listTriageSessions(
  userId: string,
  query: TriageHistoryQuery = {}
): Promise<TriageHistoryPage> {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), MAX_HISTORY_LIMIT);

  const baseWhere: Prisma.SymptomSessionWhereInput = { userId };

  if (query.from || query.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = query.from;
    if (query.to) createdAt.lte = query.to;
    baseWhere.createdAt = createdAt;
  }

  if (query.urgency && query.urgency.length > 0) {
    baseWhere.urgencyLevel = { in: query.urgency };
  }

  const pageWhere: Prisma.SymptomSessionWhereInput = { ...baseWhere };
  if (query.before) {
    pageWhere.createdAt = {
      ...(baseWhere.createdAt as Prisma.DateTimeFilter | undefined),
      lt: query.before,
    };
  }

  const result = await withUserContext(userId, async (tx) => {
    const total = await tx.symptomSession.count({ where: baseWhere });
    const rows = await tx.symptomSession.findMany({
      where: pageWhere,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        symptoms: true,
        urgencyLevel: true,
        reasoning: true,
        createdAt: true,
        result: true,
      },
    });

    return { total, rows };
  });

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const items = rows.map((row) => ({
    id: row.id,
    symptomName: readJsonString(row.symptoms, 'mainSymptom') ?? 'Pengecekan gejala',
    duration: readJsonString(row.symptoms, 'duration'),
    urgencyLevel: row.urgencyLevel,
    reasoning: row.reasoning,
    createdAt: row.createdAt.toISOString(),
    doctorSummary: readDoctorSummary(row.result),
  }));

  return {
    items,
    total: result.total,
    hasMore,
    nextBefore: hasMore && items.length > 0 ? items[items.length - 1].createdAt : null,
  };
}

/** Tanggal dari klien tidak boleh di masa depan; jatuh ke waktu sekarang. */
function safePastDate(value: string): Date {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return new Date();
  const date = new Date(parsed);
  return date.getTime() > Date.now() ? new Date() : date;
}

/**
 * Simpan riwayat dari perangkat ke akun (setelah persetujuan).
 *
 * Urgensi disimpan **apa adanya** seperti yang tercatat di perangkat; tidak ada
 * penurunan level. `red_flag_triggered` diisi konservatif (true untuk darurat)
 * karena penanda asli tidak tersedia di cache.
 */
export async function importTriageSessions(
  userId: string,
  items: ImportTriageItem[]
): Promise<number> {
  if (items.length === 0) return 0;

  await withUserContext(userId, async (tx) => {
    await tx.symptomSession.createMany({
      data: items.map((item) => ({
        userId,
        symptoms: {
          mainSymptom: item.symptomName,
          duration: item.duration,
          importedFromDevice: true,
        },
        answers: { importedFromDevice: true },
        urgencyLevel: item.urgencyLevel,
        reasoning: item.reasoning,
        nextSteps: [],
        ruleFloor: null,
        redFlagTriggered: item.urgencyLevel === 'emergency',
        result: item.doctorSummary ? { doctorSummary: item.doctorSummary } : {},
        createdAt: safePastDate(item.createdAt),
      })),
    });
  });

  return items.length;
}
