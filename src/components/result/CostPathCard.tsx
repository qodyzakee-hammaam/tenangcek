import { Building2, ClipboardList, Info, Phone, Stethoscope } from 'lucide-react';
import type { UrgencyLevel } from '@/types/triage';
import { COST_PATH_BY_URGENCY, COST_PATH_DISCLAIMER } from '@/content/costPath';
import Card from '@/components/ui/Card';

const FACILITY_ICONS = {
  puskesmas_fktp: Building2,
  klinik: Stethoscope,
  rs_igd: Building2,
  telekonsultasi: Phone,
  self_care: ClipboardList,
} as const;

interface CostPathCardProps {
  level: UrgencyLevel;
}

/** Jalur Hemat: bagian inti kartu hasil, bukan tambahan tersembunyi. */
export default function CostPathCard({ level }: CostPathCardProps) {
  const info = COST_PATH_BY_URGENCY[level] ?? COST_PATH_BY_URGENCY.pantau_di_rumah;
  const Icon = FACILITY_ICONS[info.facilityType];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">Jalur hemat</h3>
          <p className="mt-0.5 text-sm font-medium text-brand-600">{info.facilityLabel}</p>
          <p className="mt-2 text-sm leading-6 text-ink-600">{info.summary}</p>

          {info.bpjsNote && (
            <p className="mt-3 rounded-control bg-brand-50 px-3 py-2 text-xs leading-5 text-ink-600">
              <span className="font-semibold text-ink-900">BPJS/rujukan: </span>
              {info.bpjsNote}
            </p>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-ink-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {COST_PATH_DISCLAIMER}
          </p>
        </div>
      </div>
    </Card>
  );
}
