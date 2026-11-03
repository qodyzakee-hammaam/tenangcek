import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

interface DisclosureProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Detail opsional (docs/design-system.md §1).
 * Memakai <details> agar tetap bisa dipakai tanpa JavaScript dan terbaca pembaca layar.
 */
export default function Disclosure({ title, children, defaultOpen = false, className }: DisclosureProps) {
  return (
    <details open={defaultOpen} className={cn('group rounded-control border border-border bg-surface', className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}
