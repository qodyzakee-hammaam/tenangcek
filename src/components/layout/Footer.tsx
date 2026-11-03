import Link from 'next/link';
import { HeartPulse, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface py-7 text-xs text-ink-400">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="font-semibold text-ink-900">TenangCek</span>
            <span className="text-border">·</span>
            <span>Pahami keluhan, tentukan langkah.</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/crisis" className="font-medium text-urgency-emergency hover:underline">
              Bantuan darurat
            </Link>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
              Riwayat tersimpan di browser perangkat ini.
            </span>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4 leading-5">
          © {new Date().getFullYear()} TenangCek · Informasi awal, bukan pengganti diagnosis atau konsultasi tenaga medis.
        </div>
      </div>
    </footer>
  );
}
