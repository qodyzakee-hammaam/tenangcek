'use client';

import { FileText, HeartPulse, Loader2 } from 'lucide-react';
import UrgencyBadge from '@/components/result/UrgencyBadge';
import { formatDayHeading, formatTime, type DayGroup } from '@/lib/triage/format';
import type { HistoryEntry } from '@/lib/triage/localHistory';

interface HistoryTimelineProps {
  groups: DayGroup<HistoryEntry>[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpenSummary: (entry: HistoryEntry) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
  hourFilterActive: boolean;
  loadedCount: number;
}

function TimelineSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Memuat riwayat pengecekan…</span>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          aria-hidden="true"
          className="animate-pulse rounded-card border border-border bg-surface p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-full space-y-2">
              <div className="h-4 w-2/3 rounded bg-canvas" />
              <div className="h-3 w-1/3 rounded bg-canvas" />
            </div>
            <div className="h-6 w-20 rounded-full bg-canvas" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-canvas" />
            <div className="h-3 w-4/5 rounded bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Daftar riwayat berkelompok per hari, dengan tombol muat lebih banyak. */
export default function HistoryTimeline({
  groups,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onOpenSummary,
  onResetFilters,
  activeFilterCount,
  hourFilterActive,
  loadedCount,
}: HistoryTimelineProps) {
  if (isLoading) return <TimelineSkeleton />;

  if (groups.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-50 text-brand-600">
          <HeartPulse className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-semibold text-ink-900">
          {activeFilterCount > 0 ? 'Tidak ada cek pada filter ini' : 'Belum ada riwayat pengecekan'}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-400">
          {activeFilterCount > 0
            ? 'Coba longgarkan tanggal, jam, atau tingkat urgensi.'
            : 'Setelah kamu mengecek gejala, ringkasannya akan muncul di sini.'}
        </p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-control border border-border px-4 py-2 text-xs font-semibold text-ink-600 transition hover:bg-canvas"
          >
            Reset filter
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="space-y-2.5">
          <h3 className="sticky top-14 z-10 -mx-1 rounded-control bg-canvas/95 px-1 py-1 text-xs font-bold uppercase tracking-[.12em] text-ink-400 backdrop-blur md:top-16">
            {group.label}
          </h3>
          <div className="space-y-2.5">
            {group.items.map((entry) => (
              <article
                key={entry.id}
                className="rounded-card border border-border bg-surface p-4 transition hover:border-brand-500/30 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-ink-900">{entry.symptomName}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {formatTime(entry.createdAt)}
                      <span aria-hidden="true"> · </span>
                      {entry.duration || 'Durasi tidak dicatat'}
                    </p>
                  </div>
                  <UrgencyBadge level={entry.urgencyLevel} size="sm" />
                </div>

                <p className="mt-2.5 line-clamp-3 break-words text-xs leading-5 text-ink-600">
                  {entry.reasoning}
                </p>

                {entry.doctorSummary && (
                  <div className="mt-3 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => onOpenSummary(entry)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      Buka ringkasan untuk dokter
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="space-y-2 pt-1 text-center">
        {hourFilterActive && hasMore && (
          <p className="text-[11px] leading-5 text-ink-400">
            Filter jam diterapkan pada {loadedCount} cek terbaru. Persempit rentang tanggal atau muat
            lebih banyak untuk menjangkau sisanya.
          </p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoadingMore ? 'Memuat…' : 'Muat lebih banyak'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Label tanggal untuk dialog ringkasan; dipakai dashboard. */
export function summaryDateLabel(entry: HistoryEntry): string {
  return `${formatDayHeading(entry.createdAt)} · ${formatTime(entry.createdAt)}`;
}
