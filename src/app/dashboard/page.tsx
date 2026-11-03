'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight,
  BookHeart,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileCheck2,
  FileText,
  HardDrive,
  HeartPulse,
  Loader2,
  LogOut,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import BreathingExercise from '@/components/calm/BreathingExercise';
import DoctorSummaryModal from '@/components/triage/DoctorSummaryModal';
import DoctorLetterModal from '@/components/triage/DoctorLetterModal';
import UrgencyBadge from '@/components/result/UrgencyBadge';
import ConsentCard from '@/components/profile/ConsentCard';
import DeleteAccountCard from '@/components/profile/DeleteAccountCard';
import { getAuthHeaders } from '@/lib/supabase/client';
import {
  lettersKey,
  mergeHistory,
  readLocalHistory,
  removeGuestHistoryEntries,
  type HistoryEntry,
} from '@/lib/triage/localHistory';
import { fetchServerHistory, type HistoryMode } from '@/lib/triage/historyClient';
import type { DoctorLetterData } from '@/app/api/chat/letter/route';
import type { UrgencyLevel } from '@/types/triage';

const urgencyLabels: Record<UrgencyLevel, string> = {
  darurat: 'Darurat',
  segera: 'Segera',
  terjadwal: 'Terjadwal',
  pantau_di_rumah: 'Pantau di rumah',
};

/** Kartu placeholder saat riwayat masih dimuat; mencegah kedipan "belum ada". */
function HistorySkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pulse rounded-card border border-border bg-surface p-5 sm:p-6"
    >
      <span className="sr-only">Memuat riwayat pengecekan…</span>
      <div aria-hidden="true">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-5 w-40 max-w-full rounded bg-canvas" />
            <div className="h-3 w-24 rounded bg-canvas" />
          </div>
          <div className="h-6 w-20 rounded-full bg-canvas" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-canvas" />
          <div className="h-3 w-4/5 rounded bg-canvas" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="h-3 w-28 rounded bg-canvas" />
          <div className="h-8 w-28 rounded-lg bg-canvas" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, isLoading, signOut } = useAuth();

  const [sessions, setSessions] = useState<HistoryEntry[]>([]);
  const [historyOwner, setHistoryOwner] = useState<string | null>(null);
  const [historyMode, setHistoryMode] = useState<HistoryMode>('guest');
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [deviceIds, setDeviceIds] = useState<Set<string>>(() => new Set());
  const [pendingGuest, setPendingGuest] = useState<HistoryEntry[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [savedLetters, setSavedLetters] = useState<DoctorLetterData[]>([]);
  const [showBreathing, setShowBreathing] = useState(false);
  const [selectedDoctorSummary, setSelectedDoctorSummary] = useState<{
    summary: { summary: string; threeQuestionsForDoctor: string[] };
    urgencyLabel: string;
  } | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<DoctorLetterData | null>(null);

  const ownerKey = user?.id ?? 'guest';

  useEffect(() => {
    if (isLoading) return;

    try {
      const rawLetters = localStorage.getItem(lettersKey(user?.id ?? null));
      const parsedLetters = rawLetters ? JSON.parse(rawLetters) : [];
      setSavedLetters(Array.isArray(parsedLetters) ? parsedLetters : []);
    } catch {
      setSavedLetters([]);
    }
  }, [isLoading, user?.id]);

  // Riwayat dimuat hanya setelah status autentikasi pasti. Sebelum itu yang
  // tampil skeleton, bukan daftar kosong atau data pemilik sebelumnya.
  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;

    const load = async () => {
      setIsHistoryLoading(true);

      try {
        if (!user) {
          const local = readLocalHistory(null);
          if (cancelled) return;
          setSessions(local);
          setHistoryMode('guest');
          setDeviceIds(new Set());
          setPendingGuest([]);
          return;
        }

        const accountLocal = readLocalHistory(user.id);
        const guestLocal = readLocalHistory(null);
        let serverItems: HistoryEntry[] = [];
        let mode: HistoryMode = 'account';

        const result = await fetchServerHistory();
        if (result) {
          mode = result.mode;
          serverItems = result.items;
        }

        if (cancelled) return;
        setHistoryMode(mode);
        setPendingGuest(guestLocal);
        setDeviceIds(new Set(guestLocal.map((entry) => entry.id)));
        setSessions(mergeHistory(serverItems, accountLocal, guestLocal));
      } finally {
        if (!cancelled) {
          setHistoryOwner(ownerKey);
          setIsHistoryLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoading, user, ownerKey, reloadToken]);

  const importGuestHistory = useCallback(async () => {
    if (!user || pendingGuest.length === 0 || isImporting) return;

    setIsImporting(true);
    setNotice(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/triage/history/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          items: pendingGuest.map((entry) => ({
            symptomName: entry.symptomName,
            duration: entry.duration ?? null,
            urgencyLevel: entry.urgencyLevel,
            reasoning: entry.reasoning,
            createdAt: entry.createdAt,
            doctorSummary: entry.doctorSummary ?? null,
          })),
        }),
      });
      const json = (await res.json()) as { success?: boolean; imported?: number; error?: { message?: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Riwayat belum bisa disimpan ke akun.');
      }

      // Hanya entri yang berhasil diimpor yang dihapus dari cache tamu.
      removeGuestHistoryEntries(pendingGuest.map((entry) => entry.id));
      setPendingGuest([]);
      setDeviceIds(new Set());
      setNotice('Riwayat dari perangkat ini sudah disimpan ke akunmu.');
      setReloadToken((value) => value + 1);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Riwayat belum bisa disimpan ke akun. Coba lagi sebentar lagi.'
      );
    } finally {
      setIsImporting(false);
    }
  }, [user, pendingGuest, isImporting]);

  // Bila izin penyimpanan sudah aktif, riwayat tamu disimpan otomatis sekali.
  const autoImportRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || profile?.consent_health_data !== true) return;
    if (isHistoryLoading || isImporting || pendingGuest.length === 0) return;

    const signature = `${user.id}:${pendingGuest.map((entry) => entry.id).join(',')}`;
    if (autoImportRef.current === signature) return;

    autoImportRef.current = signature;
    void importGuestHistory();
  }, [user, profile?.consent_health_data, isHistoryLoading, isImporting, pendingGuest, importGuestHistory]);

  const showSkeleton = isLoading || isHistoryLoading || historyOwner !== ownerKey;
  const visibleSessions = showSkeleton ? [] : sessions;
  const recentSession = visibleSessions[0];
  const canSaveToAccount = Boolean(user) && pendingGuest.length > 0;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 18 ? 'Sore' : 'Malam';
  const displayName = user?.email?.split('@')[0] || 'kamu';

  const historyNote = showSkeleton
    ? 'Memuat riwayat pengecekan…'
    : historyMode === 'account'
      ? 'Riwayat pengecekan tersimpan di akunmu dan bisa dibuka dari perangkat lain.'
      : historyMode === 'consent_required'
        ? 'Riwayat hanya tersimpan di perangkat ini karena izin penyimpanan belum aktif.'
        : 'Mode tamu: riwayat tersimpan di browser ini dan bisa hilang jika data browser dibersihkan.';

  return (
    <AuthGuard>
      <div className="min-h-[70vh] bg-canvas">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8 sm:py-12">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Ruang pribadimu</p>
              <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-.04em] text-ink-900 sm:text-3xl lg:text-4xl">
                Selamat {greeting}, {displayName}.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600">
                Cek keluhan baru, pantau yang sudah kamu rasakan, atau siapkan catatan sebelum bertemu dokter.
              </p>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-ink-600 transition hover:border-border hover:text-ink-900"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
              </button>
            )}
          </header>

          <section className="relative overflow-hidden rounded-[1.75rem] bg-ink-900 p-6 text-white sm:p-9">
            <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-16 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface/10 px-3 py-1.5 text-xs font-semibold text-brand-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Mulai kapan saja, sesuai kebutuhanmu
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Ada yang terasa beda hari ini?</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-brand-100/80">
                  Ceritakan gejalanya dengan bahasamu sendiri. TenangCek akan bantu menyusun langkah awal yang lebih jelas.
                </p>
                <Link
                  href="/checkin"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition hover:bg-brand-100"
                >
                  Cek gejala baru <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="hidden h-28 w-28 items-center justify-center rounded-[2rem] bg-surface/10 text-white md:flex">
                <HeartPulse className="h-14 w-14" strokeWidth={1.4} aria-hidden="true" />
              </div>
            </div>
          </section>

          <section aria-label="Ringkasan aktivitas" className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-xs font-medium text-ink-400">Total cek gejala</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
                {showSkeleton ? '—' : visibleSessions.length}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {historyMode === 'account' ? 'tersimpan di akunmu' : 'riwayat di perangkat ini'}
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-xs font-medium text-ink-400">Catatan untuk dokter</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
                {showSkeleton ? '—' : savedLetters.length}
              </p>
              <p className="mt-1 text-xs text-ink-400">ringkasan yang tersimpan</p>
            </div>
            <Link
              href="/diary"
              className="group flex items-center justify-between rounded-card border border-border bg-surface p-5 transition hover:border-brand-500/40 hover:shadow-sm"
            >
              <div>
                <p className="text-xs font-medium text-ink-400">Pantau perkembangannya</p>
                <p className="mt-2 text-lg font-semibold text-ink-900">Buka symptom diary</p>
                <p className="mt-1 text-xs text-ink-400">Catat perubahan harianmu</p>
              </div>
              <BookHeart className="h-6 w-6 text-brand-600 transition group-hover:scale-110" aria-hidden="true" />
            </Link>
          </section>

          {canSaveToAccount && (
            <section
              aria-label="Riwayat dari perangkat ini"
              className="rounded-card border border-brand-500/30 bg-brand-50 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface text-brand-600">
                    <HardDrive className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">
                      Ada {pendingGuest.length} pengecekan dari perangkat ini
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-600">
                      {profile?.consent_health_data
                        ? 'Riwayat ini akan disimpan ke akunmu agar tidak hilang saat berganti perangkat.'
                        : 'Aktifkan izin penyimpanan di bagian privasi untuk menyimpannya ke akun.'}
                    </p>
                  </div>
                </div>

                {profile?.consent_health_data ? (
                  <button
                    type="button"
                    onClick={() => void importGuestHistory()}
                    disabled={isImporting}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Menyimpan…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Simpan ke akun
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href="#privasi"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Aktifkan izin
                  </a>
                )}
              </div>

              {notice && (
                <p role="status" className="mt-3 text-xs leading-5 text-ink-600">
                  {notice}
                </p>
              )}
            </section>
          )}

          {!canSaveToAccount && notice && (
            <p role="status" className="rounded-card border border-border bg-surface px-4 py-3 text-xs leading-5 text-ink-600">
              {notice}
            </p>
          )}

          <div className="grid gap-8 lg:grid-cols-[1.35fr_.8fr]">
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Jejak kesehatan</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">Pengecekan terakhir</h2>
                </div>
                {!showSkeleton && visibleSessions.length > 0 && (
                  <Link href="/checkin" className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">
                    Cek lagi
                  </Link>
                )}
              </div>

              {showSkeleton ? (
                <HistorySkeleton />
              ) : recentSession ? (
                <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-lg font-semibold text-ink-900">{recentSession.symptomName}</p>
                      <p className="mt-1 text-sm text-ink-400">{recentSession.duration || 'Durasi tidak dicatat'}</p>
                      {deviceIds.has(recentSession.id) && (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                          <HardDrive className="h-3 w-3" aria-hidden="true" /> dari perangkat ini
                        </span>
                      )}
                    </div>
                    <UrgencyBadge level={recentSession.urgencyLevel} size="sm" />
                  </div>
                  <p className="mt-4 break-words text-sm leading-6 text-ink-600">{recentSession.reasoning}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-400">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {new Date(recentSession.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    {recentSession.doctorSummary && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDoctorSummary({
                            summary: recentSession.doctorSummary!,
                            urgencyLabel: urgencyLabels[recentSession.urgencyLevel] || 'Tinjau hasil',
                          })
                        }
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-canvas"
                      >
                        <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" /> Buka ringkasan
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-50 text-brand-600">
                    <HeartPulse className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-ink-900">
                    {historyMode === 'consent_required'
                      ? 'Belum ada riwayat di akun ini'
                      : 'Belum ada riwayat pengecekan'}
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-400">
                    {historyMode === 'consent_required'
                      ? 'Izin penyimpanan belum aktif, jadi hasil cek hanya tersimpan di perangkat ini.'
                      : 'Setelah kamu mengecek gejala, ringkasannya akan muncul di sini.'}
                  </p>
                  <Link
                    href="/checkin"
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
                  >
                    Mulai cek gejala <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-card border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                    <Wind className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-ink-900">Butuh jeda sebentar?</h2>
                    <p className="mt-1 text-xs leading-5 text-ink-400">
                      Ikuti latihan napas singkat untuk bantu menenangkan diri.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-expanded={showBreathing}
                  onClick={() => setShowBreathing(!showBreathing)}
                  className="mt-4 flex min-h-11 w-full items-center justify-between rounded-control bg-brand-50 px-4 py-3 text-sm font-semibold text-ink-900 transition hover:bg-brand-50"
                >
                  {showBreathing ? 'Tutup latihan' : 'Mulai latihan napas'}{' '}
                  {showBreathing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showBreathing && (
                  <div className="mt-4 border-t border-border pt-4">
                    <BreathingExercise />
                  </div>
                )}
              </div>
              <div className="rounded-card border border-border bg-surface p-5">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  <h2 className="font-semibold text-ink-900">Sedikit pengingat</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-600">
                  TenangCek memberi informasi awal, bukan diagnosis. Kalau gejala terasa berat atau darurat, cari bantuan medis langsung.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-brand-600">
                  <Check className="h-4 w-4" aria-hidden="true" /> Kamu tetap yang menentukan langkah selanjutnya.
                </div>
              </div>
              <ConsentCard />
              <DeleteAccountCard />
            </aside>
          </div>

          {!showSkeleton && savedLetters.length > 0 && (
            <section className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Tersimpan</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">Catatan untuk konsultasi</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {savedLetters.map((letter) => (
                  <article
                    key={letter.documentId}
                    className="flex flex-col justify-between rounded-card border border-border bg-surface p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-xs font-semibold text-ink-400">{letter.documentId}</span>
                        <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                          {letter.patientOverview.urgencyLabel}
                        </span>
                      </div>
                      <h3 className="mt-3 break-words font-semibold text-ink-900">{letter.patientOverview.mainSymptom}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-600">{letter.clinicalSummary}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <span className="text-xs text-ink-400">{letter.generatedAt}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLetter(letter)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-500"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" /> Buka catatan
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <p className="flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-ink-400">
            <BookHeart className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {historyNote}
          </p>
        </div>
      </div>
      {selectedDoctorSummary && (
        <DoctorSummaryModal
          doctorSummary={selectedDoctorSummary.summary}
          urgencyLabel={selectedDoctorSummary.urgencyLabel}
          onClose={() => setSelectedDoctorSummary(null)}
        />
      )}
      {selectedLetter && <DoctorLetterModal letter={selectedLetter} onClose={() => setSelectedLetter(null)} />}
    </AuthGuard>
  );
}
