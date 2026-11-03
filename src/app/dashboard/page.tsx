'use client';

import { useEffect, useState } from 'react';
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
  HeartPulse,
  LogOut,
  Wind,
} from 'lucide-react';
import BreathingExercise from '@/components/calm/BreathingExercise';
import DoctorSummaryModal from '@/components/triage/DoctorSummaryModal';
import DoctorLetterModal from '@/components/triage/DoctorLetterModal';
import UrgencyBadge from '@/components/result/UrgencyBadge';
import ConsentCard from '@/components/profile/ConsentCard';
import DeleteAccountCard from '@/components/profile/DeleteAccountCard';
import type { DoctorLetterData } from '@/app/api/chat/letter/route';
import type { UrgencyLevel } from '@/types/triage';

interface SessionHistoryItem {
  id: string;
  symptomName: string;
  duration?: string;
  urgencyLevel: UrgencyLevel;
  reasoning: string;
  createdAt: string;
  doctorSummary?: { summary: string; threeQuestionsForDoctor: string[] };
}

const urgencyLabels: Record<UrgencyLevel, string> = {
  darurat: 'Darurat',
  segera: 'Segera',
  terjadwal: 'Terjadwal',
  pantau_di_rumah: 'Pantau di rumah',
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [showBreathing, setShowBreathing] = useState(false);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [savedLetters, setSavedLetters] = useState<DoctorLetterData[]>([]);
  const [selectedDoctorSummary, setSelectedDoctorSummary] = useState<{
    summary: { summary: string; threeQuestionsForDoctor: string[] };
    urgencyLabel: string;
  } | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<DoctorLetterData | null>(null);

  useEffect(() => {
    try {
      const rawLetters = localStorage.getItem('tenangcek_doctor_letters');
      const rawSessions = localStorage.getItem(`tenangcek_sessions_${user?.id || 'guest'}`);
      const parsedLetters = rawLetters ? JSON.parse(rawLetters) : [];
      const parsedSessions = rawSessions ? JSON.parse(rawSessions) : [];
      setSavedLetters(Array.isArray(parsedLetters) ? parsedLetters : []);
      setSessions(Array.isArray(parsedSessions) ? parsedSessions : []);
    } catch (error) {
      console.warn('Could not read saved dashboard data', error);
      setSavedLetters([]);
      setSessions([]);
    }
  }, [user?.id]);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 18 ? 'Sore' : 'Malam';
  const displayName = user?.email?.split('@')[0] || 'kamu';
  const recentSession = sessions[0];

  return (
    <AuthGuard>
      <div className="min-h-[70vh] bg-canvas">
        <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Ruang pribadimu</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-ink-900 sm:text-4xl">Selamat {greeting}, {displayName}.</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600">Cek keluhan baru, pantau yang sudah kamu rasakan, atau siapkan catatan sebelum bertemu dokter.</p>
            </div>
            {user && <button type="button" onClick={() => signOut()} className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-ink-600 transition hover:border-border hover:text-ink-900"><LogOut className="h-4 w-4" /> Keluar</button>}
          </header>

          <section className="relative overflow-hidden rounded-[1.75rem] bg-ink-900 p-6 text-white sm:p-9">
            <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-16 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface/10 px-3 py-1.5 text-xs font-semibold text-brand-100"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Mulai kapan saja, sesuai kebutuhanmu</span>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Ada yang terasa beda hari ini?</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-brand-100/80">Ceritakan gejalanya dengan bahasamu sendiri. TenangCek akan bantu menyusun langkah awal yang lebih jelas.</p>
                <Link href="/checkin" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition hover:bg-brand-100">Cek gejala baru <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="hidden h-28 w-28 items-center justify-center rounded-[2rem] bg-surface/10 text-white md:flex"><HeartPulse className="h-14 w-14" strokeWidth={1.4} /></div>
            </div>
          </section>

          <section aria-label="Ringkasan aktivitas" className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-xs font-medium text-ink-400">Total cek gejala</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{sessions.length}</p>
              <p className="mt-1 text-xs text-ink-400">riwayat di browser ini</p>
            </div>
            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-xs font-medium text-ink-400">Catatan untuk dokter</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{savedLetters.length}</p>
              <p className="mt-1 text-xs text-ink-400">ringkasan yang tersimpan</p>
            </div>
            <Link href="/diary" className="group flex items-center justify-between rounded-card border border-border bg-surface p-5 transition hover:border-brand-500/40 hover:shadow-sm">
              <div><p className="text-xs font-medium text-ink-400">Pantau perkembangannya</p><p className="mt-2 text-lg font-semibold text-ink-900">Buka symptom diary</p><p className="mt-1 text-xs text-ink-400">Catat perubahan harianmu</p></div>
              <BookHeart className="h-6 w-6 text-brand-600 transition group-hover:scale-110" />
            </Link>
          </section>

          <div className="grid gap-8 lg:grid-cols-[1.35fr_.8fr]">
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Jejak kesehatan</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">Pengecekan terakhir</h2></div>
                {sessions.length > 0 && <Link href="/checkin" className="text-sm font-semibold text-brand-600 hover:underline">Cek lagi</Link>}
              </div>
              {recentSession ? (
                <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-lg font-semibold text-ink-900">{recentSession.symptomName}</p><p className="mt-1 text-sm text-ink-400">{recentSession.duration || 'Durasi tidak dicatat'}</p></div>
                    <UrgencyBadge level={recentSession.urgencyLevel} size="sm" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-ink-600">{recentSession.reasoning}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-400"><Calendar className="h-3.5 w-3.5" />{new Date(recentSession.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {recentSession.doctorSummary && <button type="button" onClick={() => setSelectedDoctorSummary({ summary: recentSession.doctorSummary!, urgencyLabel: urgencyLabels[recentSession.urgencyLevel] || 'Tinjau hasil' })} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-canvas"><FileText className="h-4 w-4 text-brand-600" /> Buka ringkasan</button>}
                  </div>
                </div>
              ) : (
                <div className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-50 text-brand-600"><HeartPulse className="h-6 w-6" /></div>
                  <h3 className="mt-4 font-semibold text-ink-900">Belum ada riwayat pengecekan</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-400">Setelah kamu mengecek gejala, ringkasannya akan muncul di sini.</p>
                  <Link href="/checkin" className="mt-4 inline-flex items-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500">Mulai cek gejala <ArrowRight className="h-4 w-4" /></Link>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-card border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"><Wind className="h-5 w-5" /></span>
                  <div className="flex-1"><h2 className="font-semibold text-ink-900">Butuh jeda sebentar?</h2><p className="mt-1 text-xs leading-5 text-ink-400">Ikuti latihan napas singkat untuk bantu menenangkan diri.</p></div>
                </div>
                <button type="button" aria-expanded={showBreathing} onClick={() => setShowBreathing(!showBreathing)} className="mt-4 flex w-full items-center justify-between rounded-control bg-brand-50 px-4 py-3 text-sm font-semibold text-ink-900 transition hover:bg-brand-50">
                  {showBreathing ? 'Tutup latihan' : 'Mulai latihan napas'} {showBreathing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showBreathing && <div className="mt-4 border-t border-border pt-4"><BreathingExercise /></div>}
              </div>
              <div className="rounded-card border border-border bg-surface p-5">
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand-600" /><h2 className="font-semibold text-ink-900">Sedikit pengingat</h2></div>
                <p className="mt-3 text-sm leading-6 text-ink-600">TenangCek memberi informasi awal, bukan diagnosis. Kalau gejala terasa berat atau darurat, cari bantuan medis langsung.</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-brand-600"><Check className="h-4 w-4" /> Kamu tetap yang menentukan langkah selanjutnya.</div>
              </div>
              <ConsentCard />
              <DeleteAccountCard />
            </aside>
          </div>

          {savedLetters.length > 0 && <section className="space-y-4">
            <div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Tersimpan</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">Catatan untuk konsultasi</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {savedLetters.map((letter) => <article key={letter.documentId} className="flex flex-col justify-between rounded-card border border-border bg-surface p-5">
                <div><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-ink-400">{letter.documentId}</span><span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-600">{letter.patientOverview.urgencyLabel}</span></div><h3 className="mt-3 font-semibold text-ink-900">{letter.patientOverview.mainSymptom}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-600">{letter.clinicalSummary}</p></div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="text-xs text-ink-400">{letter.generatedAt}</span><button type="button" onClick={() => setSelectedLetter(letter)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-500"><FileCheck2 className="h-3.5 w-3.5" /> Buka catatan</button></div>
              </article>)}
            </div>
          </section>}

          <p className="flex items-center gap-2 border-t border-border pt-5 text-xs leading-5 text-ink-400"><BookHeart className="h-4 w-4 shrink-0" /> Riwayat pengecekan tersimpan di browser perangkat ini dan bisa hilang jika data browser dibersihkan.</p>
        </div>
      </div>
      {selectedDoctorSummary && <DoctorSummaryModal doctorSummary={selectedDoctorSummary.summary} urgencyLabel={selectedDoctorSummary.urgencyLabel} onClose={() => setSelectedDoctorSummary(null)} />}
      {selectedLetter && <DoctorLetterModal letter={selectedLetter} onClose={() => setSelectedLetter(null)} />}
    </AuthGuard>
  );
}
