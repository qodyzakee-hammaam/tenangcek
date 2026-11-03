import { AlertOctagon, CalendarCheck, Clock, HeartPulse } from 'lucide-react';
import type { UrgencyLevel } from '@/types/triage';
import { URGENCY_VISUAL } from '@/lib/ui/urgency';
import { cn } from '@/lib/ui/cn';

const ICONS = {
  darurat: AlertOctagon,
  segera: Clock,
  terjadwal: CalendarCheck,
  pantau_di_rumah: HeartPulse,
} as const;

interface UrgencyBadgeProps {
  level: UrgencyLevel;
  size?: 'sm' | 'lg';
  className?: string;
}

/** Level urgensi selalu tampil sebagai ikon + teks + warna (bukan warna saja). */
export default function UrgencyBadge({ level, size = 'lg', className }: UrgencyBadgeProps) {
  const meta = URGENCY_VISUAL[level] ?? URGENCY_VISUAL.pantau_di_rumah;
  const Icon = ICONS[level] ?? ICONS.pantau_di_rumah;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full font-semibold',
        size === 'lg' ? 'px-4 py-2 text-base' : 'px-2.5 py-1 text-xs',
        meta.badgeClass,
        className
      )}
    >
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}
