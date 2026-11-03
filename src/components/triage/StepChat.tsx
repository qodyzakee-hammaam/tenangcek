'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { SymptomPayload, TriageResult, TriageSource } from '@/types/triage';
import { AlertCircle, ArrowLeft, ArrowRight, HeartPulse, LayoutDashboard, Loader2, MessageCircleHeart, RotateCcw, Sparkles } from 'lucide-react';
import RedFlagAlert from './RedFlagAlert';
import ResultCard from '@/components/result/ResultCard';
import InteractiveAiChat from './InteractiveAiChat';
import AnxietyCheckin from '@/components/support/AnxietyCheckin';
import Chip from '@/components/ui/Chip';
import Button, { buttonClass } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/supabase/client';

interface StepQuestion {
  step: number;
  title: string;
  question: string;
  helper: string;
  type: 'text' | 'options' | 'anxiety';
  quickChips: string[];
  optional?: boolean;
}

const STEPS: StepQuestion[] = [
  {
    step: 1,
    title: 'Gejala utama',
    question: 'Apa keluhan utama yang paling terasa sekarang?',
    helper: 'Tulis dengan bahasamu sendiri, atau pilih salah satu pilihan cepat.',
    type: 'text',
    quickChips: ['Sakit kepala', 'Demam', 'Batuk & pilek', 'Nyeri perut', 'Pusing', 'Mual'],
  },
  {
    step: 2,
    title: 'Durasi',
    question: 'Sudah berapa lama keluhan ini dirasakan?',
    helper: 'Durasi membantu memperkirakan seberapa cepat keluhan perlu diperiksa.',
    type: 'options',
    quickChips: ['Baru beberapa jam', '1–2 hari', '3–5 hari', 'Lebih dari 1 minggu'],
  },
  {
    step: 3,
    title: 'Tingkat keparahan',
    question: 'Seberapa besar keluhan ini mengganggu kegiatan harian?',
    helper: 'Pilih yang paling menggambarkan kondisimu saat ini.',
    type: 'options',
    quickChips: [
      'Ringan — masih bisa beraktivitas seperti biasa',
      'Sedang — cukup mengganggu, butuh istirahat sesekali',
      'Berat — sangat mengganggu, sulit beraktivitas',
    ],
  },
  {
    step: 4,
    title: 'Gejala penyerta',
    question: 'Ada gejala lain yang muncul bersamaan?',
    helper: 'Boleh dilewati kalau tidak ada keluhan lain.',
    type: 'text',
    quickChips: ['Tidak ada keluhan lain', 'Badan lemas', 'Nafsu makan turun', 'Nyeri otot / pegal', 'Sulit tidur'],
    optional: true,
  },
  {
    step: 5,
    title: 'Check-in kecemasan',
    question: 'Sebelum melihat hasil, seberapa cemas kamu tentang keluhan ini?',
    helper: 'Jawaban ini hanya dipakai untuk menyesuaikan nada feedback, bukan untuk menurunkan urgensi.',
    type: 'anxiety',
    quickChips: [],
  },
];

type View = 'form' | 'result' | 'chat';

export default function StepChat() {
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<SymptomPayload>({
    mainSymptom: '',
    duration: '',
    severity: 'sedang',
    accompanyingSymptoms: [],
    anxietyBefore: 3,
  });
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [resultSource, setResultSource] = useState<TriageSource>('rule_based');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [view, setView] = useState<View>('form');

  const step = STEPS[currentStepIndex];

  const handleNext = async (customValue?: string) => {
    setErrorMessage(null);
    const value = (customValue !== undefined ? customValue : textInput).trim();

    if (step.step === 1 && !value && !formData.mainSymptom) {
      setErrorMessage('Mohon isi atau pilih keluhan utama terlebih dahulu.');
      return;
    }

    const updatedForm: SymptomPayload = { ...formData };
    if (step.step === 1) {
      updatedForm.mainSymptom = value || formData.mainSymptom;
    } else if (step.step === 2) {
      updatedForm.duration = value || formData.duration;
    } else if (step.step === 3) {
      if (value.toLowerCase().includes('ringan')) updatedForm.severity = 'ringan';
      else if (value.toLowerCase().includes('berat')) updatedForm.severity = 'berat';
      else updatedForm.severity = 'sedang';
    } else if (step.step === 4) {
      updatedForm.accompanyingSymptoms = value && value !== 'Tidak ada keluhan lain' ? [value] : [];
    }

    setFormData(updatedForm);
    setTextInput('');

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      await submitTriage(updatedForm);
    }
  };

  const handleSkip = () => {
    if (!step.optional) return;
    setErrorMessage(null);
    setTextInput('');
    if (currentStepIndex < STEPS.length - 1) setCurrentStepIndex(currentStepIndex + 1);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setErrorMessage(null);
    }
  };

  const submitTriage = async (payload: SymptomPayload) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Kami belum bisa memproses sekarang.');
      }

      setResult(json.data as TriageResult);
      setResultSource(json.meta?.aiSource === 'gemini' ? 'gemini' : 'rule_based');
      setView('result');

      // Riwayat lokal (mode tamu tetap tersedia; tidak menulis ke database).
      try {
        const cacheKey = `tenangcek_sessions_${user?.id || 'guest'}`;
        const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const serverSessionId: string | undefined = json.meta?.sessionId;
        const newHistoryItem = {
          id: serverSessionId ? `session-${serverSessionId}` : `session-${Date.now()}`,
          symptomName: payload.mainSymptom,
          duration: payload.duration || 'Beberapa saat',
          urgencyLevel: json.data.urgencyLevel,
          reasoning: json.data.reasoning,
          createdAt: new Date().toISOString(),
          doctorSummary: json.data.doctorSummary,
        };
        localStorage.setItem(cacheKey, JSON.stringify([newHistoryItem, ...existing]));
      } catch {
        // Riwayat lokal bersifat opsional; kegagalan menyimpan tidak menghalangi hasil.
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi gangguan jaringan.';
      setErrorMessage(`${message} Coba lagi, atau periksa ke puskesmas bila keluhan berlanjut.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setResultSource('rule_based');
    setView('form');
    setCurrentStepIndex(0);
    setFormData({
      mainSymptom: '',
      duration: '',
      severity: 'sedang',
      accompanyingSymptoms: [],
      anxietyBefore: 3,
    });
    setTextInput('');
  };

  if (result && view === 'chat') {
    return (
      <div className="h-dvh w-full overflow-hidden">
        <InteractiveAiChat result={result} formData={formData} onReset={handleReset} />
      </div>
    );
  }

  if (result && view === 'result') {
    return (
      <div className="min-h-screen bg-canvas pb-12">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Riwayat
            </Link>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
              <HeartPulse className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              Hasil triage
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6" aria-live="polite">
          {result.isRedFlagTriggered && (
            <div className="mb-4">
              <RedFlagAlert
                reason={result.reasoning}
                actionText={result.nextSteps?.[0] ?? 'Segera ke IGD terdekat.'}
              />
            </div>
          )}

          <ResultCard result={result} anxietyBefore={formData.anxietyBefore} source={resultSource} />

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setView('chat')} className={buttonClass('primary', 'md', 'flex-1')}>
              <MessageCircleHeart className="h-4 w-4" aria-hidden="true" />
              Tanya lanjut ke pendamping AI
            </button>
            <Button variant="secondary" onClick={handleReset} className="flex-1">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Cek gejala baru
            </Button>
          </div>

          <p className="mt-3 text-center text-xs leading-5 text-ink-400">
            {user
              ? 'Hasil dan riwayat tersimpan di browser perangkat ini.'
              : 'Mode tamu: hasil hanya tersimpan di browser perangkat ini dan tidak ditulis ke database.'}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-40 w-full shrink-0 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 transition hover:opacity-80">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-600 text-white">
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold text-ink-900">TenangCek</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-medium text-ink-600 transition hover:text-ink-900">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Riwayat
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-5">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
              Cek keluhan
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              Mulai dari yang paling terasa
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-600">
              Jawab satu pertanyaan per langkah. TenangCek membantu memutuskan langkah berikutnya, bukan menebak penyakit.
            </p>
          </div>

          <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
            {/* Progres: teks + bar tipis */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-400">
                <span className="text-brand-600">
                  Langkah {step.step} dari {STEPS.length} · {step.title}
                </span>
                <span>{Math.round((step.step / STEPS.length) * 100)}%</span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-canvas"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={step.step}
                aria-label={`Langkah ${step.step} dari ${STEPS.length}`}
              >
                <div
                  className="h-full bg-brand-500 transition-all duration-300 ease-out"
                  style={{ width: `${(step.step / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="mb-5 space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Pendamping triage
              </span>
              <h2 className="text-lg font-semibold leading-snug text-ink-900 sm:text-xl">{step.question}</h2>
              <p className="text-xs leading-5 text-ink-400">{step.helper}</p>
            </div>

            {step.quickChips.length > 0 && (
              <div className="mb-5">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  Pilihan cepat
                </span>
                <div className="flex flex-wrap gap-2">
                  {step.quickChips.map((chip) => (
                    <Chip key={chip} onClick={() => handleNext(chip)}>
                      {chip}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {step.type === 'anxiety' && (
              <div className="mb-5">
                <AnxietyCheckin
                  value={formData.anxietyBefore ?? 3}
                  onChange={(value) => setFormData({ ...formData, anxietyBefore: value })}
                />
              </div>
            )}

            {step.type === 'text' && (
              <div className="mb-5">
                <label htmlFor="symptom-input" className="mb-1.5 block text-xs font-semibold text-ink-600">
                  Atau tulis sendiri
                </label>
                <input
                  id="symptom-input"
                  type="text"
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleNext();
                    }
                  }}
                  placeholder={step.step === 1 ? 'Contoh: kepala terasa berat sejak pagi' : 'Tulis jawabanmu di sini'}
                  className="w-full rounded-control border border-border bg-surface px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-50"
                />
              </div>
            )}

            {errorMessage && (
              <p role="alert" className="mb-4 flex items-start gap-2 rounded-control border border-urgency-emergency/25 bg-urgency-emergency-bg p-3 text-xs leading-5 text-urgency-emergency-fg">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </p>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0 || isLoading}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-xs font-medium text-ink-600 transition hover:bg-canvas disabled:cursor-not-allowed disabled:text-ink-400/50"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Kembali
              </button>

              <div className="flex items-center gap-2">
                {step.optional && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="min-h-11 rounded-control px-3 text-xs font-medium text-ink-400 underline underline-offset-2 hover:text-ink-600"
                  >
                    Lewati
                  </button>
                )}
                <Button onClick={() => void handleNext()} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Menyusun hasil…
                    </>
                  ) : currentStepIndex === STEPS.length - 1 ? (
                    <>
                      Lihat hasil
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Lanjut
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>

          <p className="text-center text-xs leading-5 text-ink-400">
            TenangCek bukan pengganti dokter. Untuk kondisi darurat, hubungi layanan darurat atau datang ke IGD terdekat.
          </p>
        </div>
      </main>
    </div>
  );
}
