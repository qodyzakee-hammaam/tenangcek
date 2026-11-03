import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/response';
import { requireConsent } from '@/lib/supabase/auth';
import { importTriageSessions, type ImportTriageItem } from '@/lib/db/repository/sessions';
import { toDbUrgency } from '@/lib/db/urgency';
import type { UrgencyLevel } from '@/types/triage';

export const dynamic = 'force-dynamic';

/**
 * Impor riwayat dari cache perangkat ke akun.
 *
 * Dipakai setelah pengguna login dan **sudah memberi persetujuan**; route ini
 * memakai `requireConsent`, jadi tidak ada data kesehatan yang ditulis tanpa
 * izin. Urgensi disimpan apa adanya dari catatan perangkat — tidak diturunkan.
 * Nilai dari client divalidasi ketat karena bentuk JSON bisa dipalsukan.
 */

const MAX_ITEMS = 20;
const MAX_SYMPTOM_LENGTH = 200;
const MAX_REASONING_LENGTH = 4000;
const MAX_DURATION_LENGTH = 100;
const MAX_SUMMARY_LENGTH = 1000;
const MAX_QUESTION_LENGTH = 300;

function isUrgency(value: unknown): value is UrgencyLevel {
  return (
    value === 'darurat' ||
    value === 'segera' ||
    value === 'terjadwal' ||
    value === 'pantau_di_rumah'
  );
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

export async function POST(request: Request) {
  // Persetujuan diperiksa sebelum body dibaca.
  const auth = await requireConsent(request);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Riwayat belum bisa dibaca. Coba lagi.');
  }

  const rawItems = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return errorResponse(
      400,
      'invalid_items',
      'Tidak ada riwayat yang bisa disimpan dari perangkat ini.'
    );
  }

  if (rawItems.length > MAX_ITEMS) {
    return errorResponse(
      400,
      'too_many_items',
      'Riwayat yang disimpan sekaligus terlalu banyak. Coba lagi.'
    );
  }

  const items: ImportTriageItem[] = [];

  for (const raw of rawItems) {
    if (typeof raw !== 'object' || raw === null) {
      return errorResponse(400, 'invalid_item', 'Ada riwayat yang bentuknya tidak dikenali.');
    }

    const item = raw as Record<string, unknown>;
    const symptomName = cleanString(item.symptomName, MAX_SYMPTOM_LENGTH);
    const reasoning = cleanString(item.reasoning, MAX_REASONING_LENGTH);

    if (!symptomName || !reasoning || !isUrgency(item.urgencyLevel)) {
      return errorResponse(400, 'invalid_item', 'Ada riwayat yang belum lengkap.');
    }

    const duration =
      typeof item.duration === 'string' && item.duration.trim() !== ''
        ? item.duration.trim().slice(0, MAX_DURATION_LENGTH)
        : null;

    const createdAt =
      typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt))
        ? item.createdAt
        : new Date().toISOString();

    const rawSummary = item.doctorSummary;
    let doctorSummary: ImportTriageItem['doctorSummary'] = null;

    if (typeof rawSummary === 'object' && rawSummary !== null) {
      const summaryRecord = rawSummary as Record<string, unknown>;
      const summaryText = cleanString(summaryRecord.summary, MAX_SUMMARY_LENGTH);

      if (summaryText) {
        const questions = Array.isArray(summaryRecord.threeQuestionsForDoctor)
          ? summaryRecord.threeQuestionsForDoctor
              .map((question) => cleanString(question, MAX_QUESTION_LENGTH))
              .filter((question): question is string => question !== null)
              .slice(0, 3)
          : [];

        doctorSummary = { summary: summaryText, threeQuestionsForDoctor: questions };
      }
    }

    items.push({
      symptomName,
      duration,
      urgencyLevel: toDbUrgency(item.urgencyLevel),
      reasoning,
      createdAt,
      doctorSummary,
    });
  }

  try {
    const imported = await importTriageSessions(auth.userId, items);
    return NextResponse.json({ success: true, imported }, { status: 201 });
  } catch {
    return errorResponse(
      500,
      'history_import_failed',
      'Riwayat belum bisa disimpan ke akun. Coba lagi sebentar lagi.'
    );
  }
}
