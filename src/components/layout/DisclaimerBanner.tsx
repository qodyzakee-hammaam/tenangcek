import { AlertCircle } from 'lucide-react';
import { PRIMARY_EMERGENCY_CONTACT } from '@/content/emergency';

export default function DisclaimerBanner() {
  return (
    <aside aria-label="Informasi medis" className="w-full border-b border-urgency-urgent/25 bg-urgency-urgent-bg px-4 py-2.5 text-xs text-urgency-urgent-fg sm:px-8">
      <div className="mx-auto flex max-w-6xl items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="leading-5">
          <span className="font-semibold">Catatan penting:</span> TenangCek memberi informasi awal, bukan diagnosis. Untuk
          kondisi darurat, segera ke IGD atau hubungi {PRIMARY_EMERGENCY_CONTACT.number}.
        </p>
      </div>
    </aside>
  );
}
