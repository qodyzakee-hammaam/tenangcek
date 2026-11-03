'use client';

import { useState } from 'react';
import { cn } from '@/lib/ui/cn';

interface AnxietyCheckinProps {
  value: number;
  onChange: (value: number) => void;
  title?: string;
  helper?: string;
  className?: string;
}

const LEVELS = [
  { value: 1, label: 'Tenang', icon: '😌' },
  { value: 2, label: 'Sedikit khawatir', icon: '🙂' },
  { value: 3, label: 'Cukup cemas', icon: '😐' },
  { value: 4, label: 'Cemas', icon: '😟' },
  { value: 5, label: 'Sangat cemas', icon: '😰' },
] as const;

/**
 * Skala kecemasan 1–5 (docs/design-system.md §3.4).
 * Setiap pilihan punya label teks, bukan hanya emoji/warna.
 */
export default function AnxietyCheckin({
  value,
  onChange,
  title = 'Seberapa cemas kamu tentang gejala ini?',
  helper = 'Skala 1 (tenang) sampai 5 (sangat cemas). Ini bukan penilaian diagnosis.',
  className,
}: AnxietyCheckinProps) {
  const [hasInteracted, setHasInteracted] = useState(false);

  return (
    <div className={cn('rounded-card border border-border bg-surface p-4 sm:p-5', className)}>
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">{title}</legend>
        <p className="mt-1 text-xs leading-5 text-ink-400">{helper}</p>

        <div role="radiogroup" aria-label={title} className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {LEVELS.map((level) => {
            const isSelected = value === level.value;
            return (
              <button
                key={level.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange(level.value);
                  setHasInteracted(true);
                }}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 rounded-control border px-1 py-2 transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                  isSelected
                    ? 'border-brand-500 bg-brand-50 text-ink-900'
                    : 'border-border bg-surface text-ink-600 hover:bg-brand-50'
                )}
              >
                <span aria-hidden="true" className="text-xl sm:text-2xl">
                  {level.icon}
                </span>
                <span className="text-[11px] font-semibold sm:text-xs">{level.value}</span>
                <span className="hidden text-center text-[10px] leading-tight text-ink-400 sm:block">
                  {level.label}
                </span>
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-ink-400">
          {hasInteracted
            ? `Tercatat: ${value} dari 5 — ${LEVELS[value - 1]?.label ?? ''}. Terima kasih sudah jujur.`
            : 'Pilih satu angka yang paling mendekati perasaanmu.'}
        </p>
      </fieldset>
    </div>
  );
}
