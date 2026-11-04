'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight,
  BookHeart,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  HardDrive,
  HeartPulse,
  LogIn,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import BreathingExercise from '@/components/calm/BreathingExercise';
import DoctorSummaryModal from '@/components/triage/DoctorSummaryModal';
import HistoryFilter from '@/components/triage/HistoryFilter';
import HistoryTimeline from '@/components/triage/HistoryTimeline';
import { buttonClass } from '@/components/ui/Button';
import { fetchServerHistory, type HistoryMode } from '@/lib/triage/historyClient';
import { readLocalHistory, type HistoryEntry } from '@/lib/triage/localHistory';
import {
  endOfDay,
  groupByDay,
  isWithinHourRange,
  presetRange,
  startOfDay,
  toDateInputValue,
  type DatePreset,
} from '@/lib/triage/format';
import type { UrgencyLevel } from '@/types/triage';

const urgencyLabels: Record<UrgencyLevel, string> = {
  darurat: 'Darurat',
  segera: 'Segera',
  terjadwal: 'Terjadwal',
  pantau_di_rumah: 'Pantau di rumah',
};

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

interface SummarySelection {
  summary: { summary: string; threeQuestionsForDoctor: string[] };
  urgencyLabel: string;
}

/** Ajakan masuk untuk tamu; bukan daftar kosong yang membingungkan. */
function GuestHistoryCard({ pendingCount }: { pendingCount: number }) {
  return (
    <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
      <span className="flex h-11 w-11 items-center justify-center rounded-control bg-brand-50 text-brand-600">
        <LogIn className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">
        Masuk untuk menyimpan jejak kesehatan
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        Sebagai tamu, kamu tetap bisa cek gejala dan melihat hasilnya saat itu. Bedanya, riwayat
        tidak ditampilkan dan tidak tersimpan di akun.
      </p>

      <ul className="mt-4 space-y-2 text-sm leading-6 text-ink-600">
        {[
          'Riwayat pengecekan tersimpan dan bisa dibuka dari perangkat lain.',
          'Bisa difilter per tanggal, jam, dan tingkat urgensi.',
          'Kamu tetap memegang kendali: izin simpan bisa dimatikan kapan saja.',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      {pendingCount > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-control bg-brand-50 p-3 text-xs leading-5 text-ink-600">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          Ada {pendingCount} pengecekan tersimpan sementara di perangkat ini. Setelah masuk, riwayat
          itu bisa kamu simpan ke akun.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link href="/auth?redirect=/dashboard" className={buttonClass('primary', 'md', 'flex-1')}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Masuk atau daftar
        </Link>
        <Link href="/checkin" className={buttonClass('secondary', 'md', 'flex-1')}>
          Cek gejala dulu
        </Link>
      </div>
    </section>
  );
}

/** Pengguna login yang belum mengaktifkan izin simpan. */
function ConsentRequiredCard({ pendingCount }: { pendingCount: number }) {
  return (
    <section className="rounded-card border border-urgency-urgent/25 bg-urgency-urgent-bg p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface text-urgency-urgent">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-urgency-urgent-fg">Riwayat akun belum aktif</h2>
          <p className="mt-1 text-sm leading-6 text-urgency-urgent-fg/90">
            Izin simpan data kesehatan sedang nonaktif. Riwayat lama disembunyikan dan pengecekan
            baru tidak disimpan ke akun.
          </p>
          {pendingCount > 0 && (
            <p className="mt-2 text-xs leading-5 text-urgency-urgent-fg/90">
              Ada {pendingCount} pengecekan dari perangkat ini yang menunggu disimpan.
            </p>
          )}
          <Link
            href="/profile#privasi"
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-control bg-surface px-3.5 py-2 text-xs font-semibold text-ink-900 transition hover:bg-canvas"
          >
            Atur izin di Profil
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  const [mode, setMode] = useState<HistoryMode>('guest');
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingGuest, setPendingGuest] = useState<HistoryEntry[]>([]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<DatePreset | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hourFrom, setHourFrom] = useState('');
  const [hourTo, setHourTo] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel[]>([]);
  const urgencyKey = urgency.join(',');

  const [showBreathing, setShowBreathing] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<SummarySelection | null>(null);

  const fromInstant = useMemo(() => {
    const date = parseDateInput(fromDate);
    return date ? startOfDay(date).toISOString() : undefined;
  }, [fromDate]);

  const toInstant = useMemo(() => {
    const date = parseDateInput(toDate);
    return date ? endOfDay(date).toISOString() : undefined;
  }, [toDate]);

  const hourFilterActive = Boolean(hourFrom || hourTo);
  const activeFilterCount =
    (fromDate ? 1 : 0) + (toDate ? 1 : 0) + (hourFrom ? 1 : 0) + (hourTo ? 1 : 0) + urgency.length;

  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;

    const load = async () => {
      setErrorMessage('');
      setPendingGuest(readLocalHistory(null));

      if (!user) {
        setMode('guest');
        setEntries([]);
        setTotal(0);
        setHasMore(false);
        setNextBefore(null);
        setIsHistoryLoading(false);
        return;
      }

      setIsHistoryLoading(true);
      const result = await fetchServerHistory({
        from: fromInstant,
        to: toInstant,
        urgency: urgency.length > 0 ? urgency : undefined,
        limit: hourFilterActive ? 200 : 20,
      });

      if (cancelled) return;

      if (!result) {
        setErrorMessage('Riwayat belum bisa dimuat. Periksa koneksi lalu coba lagi.');
        setIsHistoryLoading(false);
        return;
      }

      setMode(result.mode);
      setEntries(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setNextBefore(result.nextBefore);
      setIsHistoryLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
    // `urgencyKey` mewakili isi array; `hourFilterActive` mengubah ukuran halaman.
  }, [isLoading, user, fromInstant, toInstant, urgencyKey, hourFilterActive, reloadToken]);

  const loadMore = useCallback(async () => {
    if (!user || !hasMore || !nextBefore || isLoadingMore) return;

    setIsLoadingMore(true);
    setErrorMessage('');

    const result = await fetchServerHistory({
      from: fromInstant,
      to: toInstant,
      urgency: urgency.length > 0 ? urgency : undefined,
      before: nextBefore,
      limit: hourFilterActive ? 200 : 20,
    });

    if (!result) {
      setErrorMessage('Bagian riwayat berikutnya belum bisa dimuat.');
      setIsLoadingMore(false);
      return;
    }

    setEntries((current) => {
      const seen = new Set(current.map((entry) => entry.id));
      return [...current, ...result.items.filter((entry) => !seen.has(entry.id))];
    });
    setTotal(result.total);
    setHasMore(result.hasMore);
    setNextBefore(result.nextBefore);
    setIsLoadingMore(false);
  }, [user, hasMore, nextBefore, isLoadingMore, fromInstant, toInstant, urgencyKey, hourFilterActive]);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => isWithinHourRange(entry.createdAt, hourFrom, hourTo)),
    [entries, hourFrom, hourTo]
  );

  const groups = useMemo(() => groupByDay(visibleEntries), [visibleEntries]);

  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const range = presetRange(preset);

    if (!range) {
      setFromDate('');
      setToDate('');
      return;
    }

    setFromDate(toDateInputValue(range.from));
    setToDate(toDateInputValue(range.to));
  };

  const handleFromDate = (value: string) => {
    setFromDate(value);
    setActivePreset('custom');
    if (value && toDate && value > toDate) setToDate(value);
  };

  const handleToDate = (value: string) => {
    setToDate(value);
    setActivePreset('custom');
    if (value && fromDate && value < fromDate) setFromDate(value);
  };

  const toggleUrgency = (level: UrgencyLevel) => {
    setUrgency((current) =>
      current.includes(level) ? current.filter((item) => item !== level) : [...current, level]
    );
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setHourFrom('');
    setHourTo('');
    setUrgency([]);
    setActivePreset('all');
  };

  return (
    <AuthGuard>
      <div className="min-h-[70vh] bg-canvas">
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">
                Jejak kesehatan
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-[-.03em] text-ink-900 sm:text-3xl">
                Riwayat pengecekan
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-600">
                {user
                  ? mode === 'consent_required'
                    ? 'Aktifkan izin simpan di Profil untuk membuka riwayat akunmu.'
                    : 'Semua pengecekan yang tersimpan, bisa disaring per tanggal, jam, dan urgensi.'
                  : 'Masuk untuk menyimpan dan melihat riwayat pengecekanmu di sini.'}
              </p>
            </div>
            <Link href="/checkin" className={buttonClass('primary', 'sm', 'min-h-11 shrink-0')}>
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
              Cek gejala
            </Link>
          </header>

          {isLoading ? (
            <HistoryTimeline
              groups={[]}
              isLoading
              isLoadingMore={false}
              hasMore={false}
              onLoadMore={() => {}}
              onOpenSummary={() => {}}
              onResetFilters={resetFilters}
              activeFilterCount={0}
              hourFilterActive={false}
              loadedCount={0}
            />
          ) : !user ? (
            <GuestHistoryCard pendingCount={pendingGuest.length} />
          ) : (
            <>
              {mode === 'consent_required' ? (
                <ConsentRequiredCard pendingCount={pendingGuest.length} />
              ) : (
                <HistoryFilter
                  isOpen={isFilterOpen}
                  onToggle={() => setIsFilterOpen((open) => !open)}
                  activePreset={activePreset}
                  onPreset={applyPreset}
                  fromDate={fromDate}
                  toDate={toDate}
                  onFromDate={handleFromDate}
                  onToDate={handleToDate}
                  hourFrom={hourFrom}
                  hourTo={hourTo}
                  onHourFrom={setHourFrom}
                  onHourTo={setHourTo}
                  urgency={urgency}
                  onToggleUrgency={toggleUrgency}
                  onReset={resetFilters}
                  activeCount={activeFilterCount}
                  total={hourFilterActive ? visibleEntries.length : total}
                />
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-urgency-emergency/25 bg-urgency-emergency-bg p-4 text-sm text-urgency-emergency-fg"
                >
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setReloadToken((value) => value + 1)}
                    className="inline-flex min-h-10 items-center rounded-control bg-surface px-3.5 py-2 text-xs font-semibold text-ink-900 transition hover:bg-canvas"
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="min-w-0">
                  {mode === 'consent_required' ? (
                    <div className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-50 text-brand-600">
                        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 font-semibold text-ink-900">Riwayat disembunyikan</h3>
                      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-400">
                        Data kesehatan tidak ditampilkan selama izin simpan nonaktif.
                      </p>
                      <Link
                        href="/profile#privasi"
                        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
                      >
                        Buka Profil
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  ) : (
                    <HistoryTimeline
                      groups={groups}
                      isLoading={isHistoryLoading}
                      isLoadingMore={isLoadingMore}
                      hasMore={hasMore}
                      onLoadMore={() => void loadMore()}
                      onOpenSummary={(entry) =>
                        setSelectedSummary({
                          summary: entry.doctorSummary!,
                          urgencyLabel: urgencyLabels[entry.urgencyLevel],
                        })
                      }
                      onResetFilters={resetFilters}
                      activeFilterCount={activeFilterCount}
                      hourFilterActive={hourFilterActive}
                      loadedCount={entries.length}
                    />
                  )}
                </div>

                <aside className="space-y-3">
                  <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                        <Wind className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-ink-900">Butuh jeda sebentar?</h2>
                        <p className="mt-1 text-xs leading-5 text-ink-400">
                          Latihan napas singkat untuk membantu menenangkan diri.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-expanded={showBreathing}
                      onClick={() => setShowBreathing(!showBreathing)}
                      className="mt-3 flex min-h-11 w-full items-center justify-between rounded-control bg-brand-50 px-3.5 py-2.5 text-xs font-semibold text-ink-900 transition hover:bg-brand-100"
                    >
                      {showBreathing ? 'Tutup latihan' : 'Mulai latihan napas'}
                      {showBreathing ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    {showBreathing && (
                      <div className="mt-3 border-t border-border pt-3">
                        <BreathingExercise />
                      </div>
                    )}
                  </div>

                  <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      <h2 className="text-sm font-semibold text-ink-900">Sedikit pengingat</h2>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-ink-600">
                      TenangCek memberi informasi awal, bukan diagnosis. Kalau gejala terasa berat
                      atau darurat, cari bantuan medis langsung.
                    </p>
                    <Link
                      href="/diary"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
                    >
                      <BookHeart className="h-3.5 w-3.5" aria-hidden="true" />
                      Catat perkembangan di diary
                    </Link>
                  </div>
                </aside>
              </div>
            </>
          )}

          <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-ink-400">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {user
              ? 'Riwayat akun tersimpan di database dan hanya bisa diakses olehmu.'
              : 'Pengecekan sebagai tamu disimpan sementara di perangkat ini dan masuk ke akun setelah kamu masuk.'}
          </p>
        </div>
      </div>

      {selectedSummary && (
        <DoctorSummaryModal
          doctorSummary={selectedSummary.summary}
          urgencyLabel={selectedSummary.urgencyLabel}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </AuthGuard>
  );
}
