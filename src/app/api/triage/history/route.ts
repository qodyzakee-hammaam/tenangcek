import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/response';
import { requireConsent } from '@/lib/supabase/auth';
import { listTriageSessions } from '@/lib/db/repository/sessions';
import { toDbUrgency } from '@/lib/db/urgency';
import type { UrgencyLevel } from '@/types/triage';

export const dynamic = 'force-dynamic';

/**
 * Riwayat pengecekan milik pengguna yang login.
 *
 * - Tamu (`401`): tidak ada riwayat di server; entri tamu hanya disimpan di
 *   perangkat sebagai titipan impor, tidak ditampilkan sebagai timeline.
 * - Belum memberi persetujuan: data kesehatan tidak dibaca dari database.
 * - Sudah memberi persetujuan: baris `symptom_sessions` miliknya sendiri,
 *   dijaga RLS lewat `withUserContext`.
 *
 * Query yang didukung: `from`, `to` (instant ISO), `urgency` (daftar level UI
 * dipisah koma), `before` (cursor ISO), dan `limit` (1–200). Respons tidak
 * pernah memuat identitas pengguna, dan log tidak memuat isi gejala.
 */

const UI_URGENCY: UrgencyLevel[] = ['darurat', 'segera', 'terjadwal', 'pantau_di_rumah'];
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 20;

function parseDate(value: string | null): Date | null | 'invalid' {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'invalid';
  return new Date(parsed);
}

export async function GET(request: Request) {
  const auth = await requireConsent(request);

  if (!auth.ok) {
    if (auth.status === 401) {
      return NextResponse.json({
        success: true,
        mode: 'guest',
        data: [],
        meta: { total: 0, hasMore: false, nextBefore: null },
      });
    }

    if (auth.error.code === 'consent_required') {
      return NextResponse.json({
        success: true,
        mode: 'consent_required',
        data: [],
        meta: { total: 0, hasMore: false, nextBefore: null },
      });
    }

    return errorResponse(auth.status, auth.error.code, auth.error.message);
  }

  const params = new URL(request.url).searchParams;

  const from = parseDate(params.get('from'));
  const to = parseDate(params.get('to'));
  const before = parseDate(params.get('before'));

  if (from === 'invalid' || to === 'invalid' || before === 'invalid') {
    return errorResponse(400, 'invalid_date', 'Format tanggal riwayat belum dikenali.');
  }

  if (from && to && from.getTime() > to.getTime()) {
    return errorResponse(400, 'invalid_range', 'Tanggal awal harus sebelum tanggal akhir.');
  }

  const limitParam = Number.parseInt(params.get('limit') ?? '', 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const urgency = (params.get('urgency') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is UrgencyLevel => UI_URGENCY.includes(value as UrgencyLevel))
    .map((value) => toDbUrgency(value));

  try {
    const page = await listTriageSessions(auth.userId, {
      from: from ?? undefined,
      to: to ?? undefined,
      before: before ?? undefined,
      urgency: urgency.length > 0 ? urgency : undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      mode: 'account',
      data: page.items,
      meta: {
        total: page.total,
        hasMore: page.hasMore,
        nextBefore: page.nextBefore,
      },
    });
  } catch {
    return errorResponse(
      500,
      'history_load_failed',
      'Riwayat belum bisa dimuat. Coba lagi sebentar lagi.'
    );
  }
}
