'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BookHeart,
  CalendarDays,
  Check,
  FileCheck2,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import ConsentCard from '@/components/profile/ConsentCard';
import DeleteAccountCard from '@/components/profile/DeleteAccountCard';
import DoctorLetterModal from '@/components/triage/DoctorLetterModal';
import { buttonClass } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/supabase/client';
import {
  lettersKey,
  readLocalHistory,
  removeGuestHistoryEntries,
  type HistoryEntry,
} from '@/lib/triage/localHistory';
import type { DoctorLetterData } from '@/app/api/chat/letter/route';

const IMPORT_BATCH_SIZE = 20;

/** Batas endpoint impor; entri di luar batch pertama dikirim bertahap. */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function formatMemberSince(createdAt: string | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/** Tamu: profil belum ada, tetapi tetap diberi jalan masuk yang jelas. */
function GuestProfile() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setPendingCount(readLocalHistory(null).length);
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">
          Kamu sedang memakai TenangCek sebagai tamu
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
          Semua fitur pemeriksaan tetap bisa dipakai. Profil, izin simpan, dan riwayat permanen baru
          tersedia setelah kamu masuk.
        </p>

        <ul className="mt-4 space-y-2 text-sm leading-6 text-ink-600">
          {[
            'Riwayat pengecekan tersimpan di akun, bukan hanya di perangkat ini.',
            'Kamu bisa mengatur izin simpan data kesehatan kapan saja.',
            'Catatan dokter dan diary bisa dibuka lagi dari perangkat lain.',
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
            Ada {pendingCount} pengecekan tersimpan sementara di perangkat ini. Setelah masuk dan
            memberi izin, riwayat itu bisa disimpan ke akun.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/auth?redirect=/profile" className={buttonClass('primary', 'md', 'flex-1')}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Masuk atau daftar
          </Link>
          <Link href="/checkin" className={buttonClass('secondary', 'md', 'flex-1')}>
            Cek gejala dulu
          </Link>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <BookHeart className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink-900">Catatan tamu</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-600">
          Diary dan hasil cek sebagai tamu tidak ditulis ke database. Diary tamu hanya bertahan
          selama tab ini terbuka.
        </p>
        <Link
          href="/diary"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
        >
          Buka diary
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

export default function ProfileView() {
  const { user, profile, isLoading, signOut } = useAuth();
  const router = useRouter();

  const [pendingGuest, setPendingGuest] = useState<HistoryEntry[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isImportError, setIsImportError] = useState(false);
  const [savedLetters, setSavedLetters] = useState<DoctorLetterData[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<DoctorLetterData | null>(null);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const consented = profile?.consent_health_data === true;

  useEffect(() => {
    if (isLoading || !user) return;

    setPendingGuest(readLocalHistory(null));

    try {
      const raw = localStorage.getItem(lettersKey(user.id));
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedLetters(Array.isArray(parsed) ? (parsed as DoctorLetterData[]) : []);
    } catch {
      setSavedLetters([]);
    }
  }, [isLoading, user]);

  const importGuestHistory = useCallback(async () => {
    if (!user || pendingGuest.length === 0 || isImporting) return;

    setIsImporting(true);
    setNotice(null);
    setIsImportError(false);

    let importedTotal = 0;
    const remaining = [...pendingGuest];

    try {
      for (const batch of chunk(pendingGuest, IMPORT_BATCH_SIZE)) {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/triage/history/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            items: batch.map((entry) => ({
              symptomName: entry.symptomName,
              duration: entry.duration ?? null,
              urgencyLevel: entry.urgencyLevel,
              reasoning: entry.reasoning,
              createdAt: entry.createdAt,
              doctorSummary: entry.doctorSummary ?? null,
            })),
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          imported?: number;
          error?: { message?: string };
        };

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Riwayat belum bisa disimpan ke akun.');
        }

        // Hanya entri yang sudah terkirim yang dihapus dari cache tamu.
        removeGuestHistoryEntries(batch.map((entry) => entry.id));
        importedTotal += json.imported ?? batch.length;
        batch.forEach((entry) => {
          const index = remaining.findIndex((item) => item.id === entry.id);
          if (index >= 0) remaining.splice(index, 1);
        });
      }

      setPendingGuest(remaining);
      setNotice(
        `${importedTotal} pengecekan dari perangkat ini sudah disimpan ke akunmu dan masuk ke riwayat.`
      );
    } catch (error) {
      setPendingGuest(remaining);
      setIsImportError(true);
      setNotice(
        error instanceof Error
          ? `${error.message}${importedTotal > 0 ? ` ${importedTotal} entri sudah tersimpan.` : ''}`
          : 'Riwayat belum bisa disimpan ke akun. Coba lagi sebentar lagi.'
      );
    } finally {
      setIsImporting(false);
    }
  }, [user, pendingGuest, isImporting]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
    router.replace('/');
  };

  const displayName = user?.email?.split('@')[0] ?? 'kamu';
  const memberSince = formatMemberSince(profile?.created_at);

  return (
    <AuthGuard>
      <div className="min-h-[70vh] bg-canvas">
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
          <header>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Akunmu</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-.03em] text-ink-900 sm:text-3xl">
              Profil dan privasi
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-600">
              Atur izin penyimpanan, simpan riwayat dari perangkat ini, dan kelola akunmu di satu
              tempat.
            </p>
          </header>

          {isLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="animate-pulse rounded-card border border-border bg-surface p-6"
            >
              <span className="sr-only">Memuat profil…</span>
              <div aria-hidden="true" className="space-y-3">
                <div className="h-11 w-11 rounded-control bg-canvas" />
                <div className="h-4 w-40 rounded bg-canvas" />
                <div className="h-3 w-56 max-w-full rounded bg-canvas" />
              </div>
            </div>
          ) : !user ? (
            <GuestProfile />
          ) : (
            <>
              <section
                aria-labelledby="identitas-heading"
                className="rounded-card border border-border bg-surface p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-brand-600 text-lg font-bold text-white">
                      {displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="identitas-heading"
                        className="truncate text-base font-semibold text-ink-900"
                      >
                        {displayName}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-ink-400">{user.email}</p>
                      {memberSince && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-ink-400">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          Bergabung sejak {memberSince}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      consented
                        ? 'bg-brand-50 text-brand-600'
                        : 'bg-canvas text-ink-400'
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    {consented ? 'Izin simpan aktif' : 'Izin simpan nonaktif'}
                  </span>
                </div>

                <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-ink-400">
                  {consented
                    ? 'Data kesehatanmu disimpan di akun dan hanya bisa diakses olehmu.'
                    : 'Selama izin simpan nonaktif, data kesehatan tidak ditulis ke akun dan riwayat lama disembunyikan.'}
                </p>
              </section>

              <ConsentCard />

              {pendingGuest.length > 0 && (
                <section
                  aria-labelledby="impor-heading"
                  className="rounded-card border border-brand-500/30 bg-brand-50 p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface text-brand-600">
                      <HardDrive className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 id="impor-heading" className="font-semibold text-ink-900">
                        Riwayat dari perangkat ini
                      </h2>
                      <p className="mt-1 text-xs leading-5 text-ink-600">
                        Ada {pendingGuest.length} pengecekan yang tersimpan saat kamu memakai mode
                        tamu.
                        {consented
                          ? ' Simpan ke akun agar tidak hilang saat berganti perangkat.'
                          : ' Aktifkan izin simpan di atas lebih dulu untuk memindahkannya.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {consented ? (
                      <button
                        type="button"
                        onClick={() => void importGuestHistory()}
                        disabled={isImporting}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isImporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isImporting ? 'Menyimpan…' : 'Simpan ke akun'}
                      </button>
                    ) : (
                      <a
                        href="#privasi"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        Aktifkan izin dulu
                      </a>
                    )}
                  </div>

                  {notice && (
                    <p
                      role="status"
                      className={`mt-3 flex items-start gap-2 rounded-control px-3 py-2 text-xs leading-5 ${
                        isImportError
                          ? 'bg-urgency-emergency-bg text-urgency-emergency-fg'
                          : 'bg-surface text-ink-600'
                      }`}
                    >
                      {isImportError && (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      {notice}
                    </p>
                  )}
                </section>
              )}

              {!isImportError && notice && pendingGuest.length === 0 && (
                <p
                  role="status"
                  className="rounded-card border border-border bg-surface px-4 py-3 text-xs leading-5 text-ink-600"
                >
                  {notice}
                </p>
              )}

              <section
                aria-labelledby="surat-heading"
                className="rounded-card border border-border bg-surface p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="surat-heading" className="font-semibold text-ink-900">
                      Catatan untuk konsultasi
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-ink-400">
                      Ringkasan yang kamu simpan setelah berbincang dengan pendamping AI.
                    </p>
                  </div>
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                    {savedLetters.length} tersimpan
                  </span>
                </div>

                {savedLetters.length === 0 ? (
                  <p className="mt-4 rounded-control border border-dashed border-border px-4 py-6 text-center text-xs leading-5 text-ink-400">
                    Belum ada catatan tersimpan. Buka obrolan setelah cek gejala, lalu pilih
                    &ldquo;Simpan &amp; Selesai&rdquo;.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {savedLetters.map((letter) => (
                      <article
                        key={letter.documentId}
                        className="flex flex-col justify-between rounded-control border border-border p-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-[11px] font-semibold text-ink-400">
                              {letter.documentId}
                            </span>
                            <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                              {letter.patientOverview.urgencyLabel}
                            </span>
                          </div>
                          <h3 className="mt-2 break-words text-sm font-semibold text-ink-900">
                            {letter.patientOverview.mainSymptom}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-600">
                            {letter.clinicalSummary}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                          <span className="text-[11px] text-ink-400">{letter.generatedAt}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedLetter(letter)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-control bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-500"
                          >
                            <FileCheck2 className="h-3 w-3" aria-hidden="true" />
                            Buka
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section
                aria-labelledby="keluar-heading"
                className="rounded-card border border-border bg-surface p-5"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-ink-400" aria-hidden="true" />
                  <h2 id="keluar-heading" className="font-semibold text-ink-900">
                    Keluar dari akun
                  </h2>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-400">
                  Riwayat di database tetap aman. Salinan data akun di perangkat ini akan
                  dibersihkan, jadi kamu perlu masuk lagi untuk membukanya.
                </p>

                {!isConfirmingSignOut ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingSignOut(true)}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-canvas"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Keluar
                  </button>
                ) : (
                  <div className="mt-4 rounded-control bg-canvas p-3.5">
                    <p className="text-xs leading-5 text-ink-600">
                      Yakin ingin keluar dari akun ini?
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        disabled={isSigningOut}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSigningOut && (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        {isSigningOut ? 'Keluar…' : 'Ya, keluar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingSignOut(false)}
                        disabled={isSigningOut}
                        className="inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-canvas disabled:opacity-60"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <DeleteAccountCard />
            </>
          )}

          <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-ink-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            TenangCek tidak meminta data identitas medis. Kamu tetap yang menentukan apa yang ingin
            disimpan.
          </p>
        </div>
      </div>

      {selectedLetter && (
        <DoctorLetterModal letter={selectedLetter} onClose={() => setSelectedLetter(null)} />
      )}
    </AuthGuard>
  );
}
