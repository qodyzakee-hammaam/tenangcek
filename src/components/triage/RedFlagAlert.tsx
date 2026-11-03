'use client';

import Link from 'next/link';
import { AlertTriangle, PhoneCall, ShieldAlert } from 'lucide-react';
import { PRIMARY_EMERGENCY_CONTACT } from '@/content/emergency';
import { buttonClass } from '@/components/ui/Button';

interface Props {
  reason: string;
  actionText: string;
}

/** Banner red flag fisik: memotong alur normal dan menampilkan tindakan darurat. */
export default function RedFlagAlert({ reason, actionText }: Props) {
  return (
    <div
      role="alert"
      className="rounded-card border-2 border-urgency-emergency/40 bg-urgency-emergency-bg p-5 text-urgency-emergency-fg sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-urgency-emergency text-white">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-urgency-emergency-bg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-urgency-emergency/30">
            Tanda bahaya terdeteksi
          </span>
          <h2 className="mt-2 text-lg font-semibold text-ink-900">Sebaiknya segera cari pertolongan medis</h2>
          <p className="mt-1 text-sm leading-6">{reason}</p>

          <div className="mt-4 rounded-control bg-surface px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-urgency-emergency">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Tindakan sekarang
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-900">{actionText}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href={`tel:${PRIMARY_EMERGENCY_CONTACT.tel}`} className={buttonClass('danger', 'md')}>
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              Hubungi {PRIMARY_EMERGENCY_CONTACT.number}
            </a>
            <Link href="/crisis" className="text-sm font-semibold text-urgency-emergency underline underline-offset-2">
              Butuh bantuan kesehatan jiwa?
            </Link>
          </div>
          <p className="mt-2 text-xs leading-5">Minta bantuan orang terdekat untuk mendampingi atau mengantar.</p>
        </div>
      </div>
    </div>
  );
}
