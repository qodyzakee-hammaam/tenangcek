/**
 * Utilitas tanggal untuk riwayat pengecekan.
 *
 * Semua perhitungan memakai zona waktu perangkat pengguna. Server menyimpan
 * `created_at` dalam UTC, jadi batas hari dan filter jam dihitung di sini lalu
 * dikirim sebagai instant ISO.
 */

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Kunci tanggal lokal `YYYY-MM-DD` (bukan UTC). */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

/** Nilai untuk `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  return dayKey(date);
}

export type DatePreset = '7d' | '30d' | '3m' | 'year' | 'all';

/** Rentang siap pakai untuk chip preset. `null` berarti tanpa batas. */
export function presetRange(
  preset: DatePreset,
  now = new Date()
): { from: Date; to: Date } | null {
  const to = endOfDay(now);

  switch (preset) {
    case '7d': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { from, to };
    }
    case '30d': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 29);
      return { from, to };
    }
    case '3m': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 89);
      return { from, to };
    }
    case 'year': {
      return { from: new Date(now.getFullYear(), 0, 1), to };
    }
    case 'all':
    default:
      return null;
  }
}

/** Judul kelompok: "Hari ini", "Kemarin", atau tanggal lengkap. */
export function formatDayHeading(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak diketahui';

  const today = dayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  if (dayKey(date) === today) return 'Hari ini';
  if (dayKey(date) === dayKey(yesterdayDate)) return 'Kemarin';

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Jam lokal, mis. "14.05". */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--.--';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Kelompokkan entri (sudah terurut terbaru) per hari lokal. */
export function groupByDay<T extends { createdAt: string }>(entries: T[]): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();

  for (const entry of entries) {
    const key = dayKey(new Date(entry.createdAt));
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(entry);
    } else {
      groups.set(key, { key, label: formatDayHeading(entry.createdAt), items: [entry] });
    }
  }

  return Array.from(groups.values());
}

/**
 * Filter jam lokal. Mendukung rentang yang melewati tengah malam
 * (mis. 22.00–06.00), karena keluhan sering dicek malam hari.
 */
export function isWithinHourRange(iso: string, from: string, to: string): boolean {
  if (!from && !to) return true;

  const hour = new Date(iso).getHours();
  const start = from ? Number(from) : 0;
  const end = to ? Number(to) : 23;

  if (!Number.isFinite(start) || !Number.isFinite(end)) return true;

  if (start <= end) return hour >= start && hour <= end;
  return hour >= start || hour <= end;
}
