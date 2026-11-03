import { URGENCY_VISUAL } from '@/lib/ui/urgency';
import type { UrgencyLevel } from '@/types/triage';

/**
 * Utility Formatters TenangCek
 */

export function formatDateIndo(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatUrgencyBadge(level: string): { label: string; color: string } {
  const meta = URGENCY_VISUAL[level as UrgencyLevel] ?? URGENCY_VISUAL.pantau_di_rumah;
  return { label: meta.label, color: meta.badgeClass };
}
