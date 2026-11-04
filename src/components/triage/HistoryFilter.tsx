'use client';

import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import { cn } from '@/lib/ui/cn';
import type { DatePreset } from '@/lib/triage/format';
import type { UrgencyLevel } from '@/types/triage';

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
  { value: '3m', label: '3 bulan' },
  { value: 'year', label: 'Tahun ini' },
  { value: 'all', label: 'Semua' },
];

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string }[] = [
  { value: 'darurat', label: 'Darurat' },
  { value: 'segera', label: 'Segera' },
  { value: 'terjadwal', label: 'Terjadwal' },
  { value: 'pantau_di_rumah', label: 'Pantau' },
];

const HOURS = Array.from({ length: 24 }, (_, index) => index);

const FIELD_CLASS =
  'w-full rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-50';

interface HistoryFilterProps {
  isOpen: boolean;
  onToggle: () => void;
  activePreset: DatePreset | 'custom';
  onPreset: (preset: DatePreset) => void;
  fromDate: string;
  toDate: string;
  onFromDate: (value: string) => void;
  onToDate: (value: string) => void;
  hourFrom: string;
  hourTo: string;
  onHourFrom: (value: string) => void;
  onHourTo: (value: string) => void;
  urgency: UrgencyLevel[];
  onToggleUrgency: (level: UrgencyLevel) => void;
  onReset: () => void;
  activeCount: number;
  total: number;
}

/** Panel filter riwayat: tanggal, jam lokal, dan tingkat urgensi. */
export default function HistoryFilter({
  isOpen,
  onToggle,
  activePreset,
  onPreset,
  fromDate,
  toDate,
  onFromDate,
  onToDate,
  hourFrom,
  hourTo,
  onHourFrom,
  onHourTo,
  urgency,
  onToggleUrgency,
  onReset,
  activeCount,
  total,
}: HistoryFilterProps) {
  const overnight = Boolean(hourFrom) && Boolean(hourTo) && Number(hourFrom) > Number(hourTo);

  return (
    <section aria-label="Filter riwayat" className="rounded-card border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="history-filter-panel"
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink-900 md:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Filter
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-600">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-ink-400 transition', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <div
        id="history-filter-panel"
        className={cn('border-t border-border p-4 sm:p-5 md:block md:border-t-0', isOpen ? 'block' : 'hidden')}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rentang cepat">
          {PRESETS.map((preset) => (
            <Chip
              key={preset.value}
              selected={activePreset === preset.value}
              onClick={() => onPreset(preset.value)}
              className="min-h-10 px-3 py-1.5 text-xs"
            >
              {preset.label}
            </Chip>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-600">Dari tanggal</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => onFromDate(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-600">Sampai tanggal</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => onToDate(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-600">Dari jam</span>
            <select
              value={hourFrom}
              onChange={(event) => onHourFrom(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Semua jam</option>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, '0')}.00
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-600">Sampai jam</span>
            <select
              value={hourTo}
              onChange={(event) => onHourTo(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Semua jam</option>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, '0')}.59
                </option>
              ))}
            </select>
          </label>
        </div>

        {overnight && (
          <p className="mt-2 text-[11px] leading-5 text-ink-400">
            Rentang melewati tengah malam, misalnya 22.00 sampai 06.00.
          </p>
        )}

        <fieldset className="mt-4">
          <legend className="mb-2 text-xs font-semibold text-ink-600">Tingkat urgensi</legend>
          <div className="flex flex-wrap gap-2">
            {URGENCY_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={urgency.includes(option.value)}
                onClick={() => onToggleUrgency(option.value)}
                className="min-h-10 px-3 py-1.5 text-xs"
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-ink-400" aria-live="polite">
            {total} pengecekan cocok dengan filter ini
          </p>
          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-xs font-semibold text-ink-600 transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset filter
          </button>
        </div>
      </div>
    </section>
  );
}
