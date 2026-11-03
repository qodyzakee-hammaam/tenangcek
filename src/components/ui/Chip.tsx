import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/ui/cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Pilihan cepat besar dengan target sentuh minimal 44px. */
export default function Chip({ selected = false, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 items-center rounded-control border px-3.5 py-2 text-left text-sm transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        selected
          ? 'border-brand-500 bg-brand-50 font-semibold text-ink-900'
          : 'border-border bg-surface text-ink-600 hover:border-brand-500/50 hover:bg-brand-50',
        className
      )}
      {...props}
    />
  );
}
