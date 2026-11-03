import type { UrgencyLevel } from '@/types/triage';

export interface UrgencyVisual {
  /** Label yang tampil ke pengguna (docs/design-system.md §2.1). */
  label: string;
  /** Satu baris tindakan utama. */
  action: string;
  timeframe: string;
  badgeClass: string;
  borderClass: string;
  surfaceClass: string;
  fgClass: string;
  iconTileClass: string;
}

/**
 * Pemetaan level urgensi ke token semantik.
 * Level selalu ditampilkan sebagai ikon + teks + warna, bukan warna saja.
 */
export const URGENCY_VISUAL: Record<UrgencyLevel, UrgencyVisual> = {
  darurat: {
    label: 'Darurat',
    action: 'Ke IGD sekarang atau hubungi layanan darurat',
    timeframe: 'Sekarang',
    badgeClass: 'bg-urgency-emergency-bg text-urgency-emergency-fg ring-1 ring-urgency-emergency/30',
    borderClass: 'border-urgency-emergency/40',
    surfaceClass: 'bg-urgency-emergency-bg',
    fgClass: 'text-urgency-emergency-fg',
    iconTileClass: 'bg-urgency-emergency-bg text-urgency-emergency',
  },
  segera: {
    label: 'Segera',
    action: 'Periksa ke dokter dalam 24 jam',
    timeframe: 'Dalam 24 jam',
    badgeClass: 'bg-urgency-urgent-bg text-urgency-urgent-fg ring-1 ring-urgency-urgent/30',
    borderClass: 'border-urgency-urgent/40',
    surfaceClass: 'bg-urgency-urgent-bg',
    fgClass: 'text-urgency-urgent-fg',
    iconTileClass: 'bg-urgency-urgent-bg text-urgency-urgent',
  },
  terjadwal: {
    label: 'Terjadwal',
    action: 'Buat janji pemeriksaan dalam beberapa hari',
    timeframe: 'Beberapa hari',
    badgeClass: 'bg-urgency-scheduled-bg text-urgency-scheduled-fg ring-1 ring-urgency-scheduled/30',
    borderClass: 'border-urgency-scheduled/40',
    surfaceClass: 'bg-urgency-scheduled-bg',
    fgClass: 'text-urgency-scheduled-fg',
    iconTileClass: 'bg-urgency-scheduled-bg text-urgency-scheduled',
  },
  pantau_di_rumah: {
    label: 'Pantau di rumah',
    action: 'Pantau gejala dan waspadai tanda eskalasi',
    timeframe: 'Rawat mandiri',
    badgeClass: 'bg-urgency-monitor-bg text-urgency-monitor-fg ring-1 ring-urgency-monitor/30',
    borderClass: 'border-urgency-monitor/40',
    surfaceClass: 'bg-urgency-monitor-bg',
    fgClass: 'text-urgency-monitor-fg',
    iconTileClass: 'bg-urgency-monitor-bg text-urgency-monitor',
  },
};

/** Kelas ringkas untuk badge kecil di riwayat/dashboard. */
export function urgencyBadgeClass(level: UrgencyLevel | string): string {
  const meta = URGENCY_VISUAL[level as UrgencyLevel] ?? URGENCY_VISUAL.pantau_di_rumah;
  return meta.badgeClass;
}

export function urgencyLabel(level: UrgencyLevel | string): string {
  return (URGENCY_VISUAL[level as UrgencyLevel] ?? URGENCY_VISUAL.pantau_di_rumah).label;
}
