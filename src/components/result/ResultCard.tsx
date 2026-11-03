'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Info, Sparkles, Wind } from 'lucide-react';
import type { TriageResult, TriageSource } from '@/types/triage';
import UrgencyBadge from './UrgencyBadge';
import CostPathCard from './CostPathCard';
import Disclaimer from './Disclaimer';
import { URGENCY_VISUAL } from '@/lib/ui/urgency';
import Disclosure from '@/components/ui/Disclosure';
import { buttonClass } from '@/components/ui/Button';
import AnxietyCheckin from '@/components/support/AnxietyCheckin';
import BreathingExercise from '@/components/calm/BreathingExercise';
import DoctorSummaryModal from '@/components/triage/DoctorSummaryModal';

interface ResultCardProps {
  result: TriageResult;
  anxietyBefore?: number;
  /** Asal penjelasan; dipakai untuk memberi tahu dengan tenang bila AI tidak dipakai. */
  source?: TriageSource;
}

/**
 * Kartu hasil triage (docs/design-system.md §3.2).
 * Urutan wajib: urgensi → alasan → kemungkinan umum → konteks kecemasan →
 * tanda bahaya → langkah (maks 3) → jalur hemat → ringkasan dokter → check-in → disclaimer.
 */
export default function ResultCard({ result, anxietyBefore, source }: ResultCardProps) {
  const [showDoctorSummary, setShowDoctorSummary] = useState(false);
  const [anxietyAfter, setAnxietyAfter] = useState<number | null>(null);
  const meta = URGENCY_VISUAL[result.urgencyLevel] ?? URGENCY_VISUAL.pantau_di_rumah;
  const nextSteps = (result.nextSteps ?? []).slice(0, 3);
  const showBreathing = result.calmSupport?.suggestBreathingExercise || (anxietyBefore ?? 0) >= 4;
  // Red flag sudah dijelaskan RedFlagAlert; catatan ini hanya untuk alur biasa.
  const showRuleBasedNote = source === 'rule_based' && !result.isRedFlagTriggered;

  return (
    <div className="space-y-4">
      <article className="overflow-hidden rounded-card border border-border bg-surface">
        {/* 1. Level urgensi + tindakan utama */}
        <header className={`border-b border-border px-5 py-5 sm:px-6 ${meta.surfaceClass}`}>
          <UrgencyBadge level={result.urgencyLevel} size="lg" />
          <p className="mt-3 text-lg font-semibold leading-snug text-ink-900">{meta.action}</p>
          <p className="mt-1 text-sm text-ink-600">
            Waktu yang disarankan: <strong className="font-semibold text-ink-900">{meta.timeframe}</strong>
          </p>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {/* Catatan asal penjelasan — hanya bila AI tidak dipakai */}
          {showRuleBasedNote && (
            <section
              aria-labelledby="sumber-heading"
              className="rounded-control border border-border bg-canvas px-4 py-3"
            >
              <h2 id="sumber-heading" className="flex items-center gap-2 text-xs font-semibold text-ink-900">
                <Info className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                Penjelasan dari panduan standar TenangCek
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-ink-600">
                Penjelasan ini disusun dari panduan standar TenangCek, bukan dari model AI. Tingkat urgensi dan
                langkah berikutnya tetap mengikuti aturan keselamatan yang sama.
              </p>
            </section>
          )}

          {/* 2. Alasan singkat */}
          <section aria-labelledby="alasan-heading">
            <h2 id="alasan-heading" className="text-sm font-semibold text-ink-900">
              Kenapa kamu mendapat hasil ini
            </h2>
            <p className="mt-2 rounded-control bg-canvas px-4 py-3 text-sm leading-6 text-ink-600">
              {result.reasoning}
            </p>
          </section>

          {/* 3. Kemungkinan umum (detail opsional) */}
          {result.commonCauses?.length > 0 && (
            <Disclosure title="Kemungkinan penyebab paling lazim">
              <ul className="space-y-2">
                {result.commonCauses.map((cause, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm leading-6 text-ink-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-ink-400">
                Ini bukan diagnosis. Penyebab di atas hanya yang paling sering terjadi pada keluhan serupa.
              </p>
            </Disclosure>
          )}

          {/* 4. Konteks kecemasan — tidak menurunkan urgensi */}
          {result.calmSupport?.message && (
            <section aria-labelledby="cemas-heading" className="rounded-control bg-brand-50 p-4">
              <h2 id="cemas-heading" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Konteks kecemasan
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">{result.calmSupport.message}</p>
              <p className="mt-2 text-xs leading-5 text-ink-400">
                Rasa cemas bisa memperkuat gejala yang dirasakan. Ini tidak menghapus kemungkinan penyebab fisik, jadi
                level urgensi di atas tetap berlaku.
              </p>
            </section>
          )}

          {/* 5. Tanda bahaya (detail opsional) */}
          {result.dangerSignsToWatch?.length > 0 && (
            <Disclosure title="Tanda bahaya: kapan perlu naik level">
              <ul className="space-y-2">
                {result.dangerSignsToWatch.map((sign, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm leading-6 text-urgency-emergency-fg">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-urgency-emergency" aria-hidden="true" />
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}

          {/* 6. Langkah berikutnya — selalu terlihat, maksimal 3 */}
          <section aria-labelledby="langkah-heading">
            <h2 id="langkah-heading" className="text-sm font-semibold text-ink-900">
              Langkah berikutnya
            </h2>
            <ol className="mt-2 space-y-2">
              {nextSteps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-control border border-border bg-surface px-4 py-3 text-sm leading-6 text-ink-600"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 7. Jalur hemat */}
          <CostPathCard level={result.urgencyLevel} />

          {/* Latihan napas — muncul bila disarankan atau kecemasan tinggi */}
          {showBreathing && (
            <Disclosure title="Latihan napas 1 menit">
              <BreathingExercise />
            </Disclosure>
          )}

          {/* 8. Ringkasan untuk dokter */}
          <section aria-labelledby="dokter-heading" className="rounded-control border border-border p-4">
            <h2 id="dokter-heading" className="text-sm font-semibold text-ink-900">
              Ringkasan untuk dokter
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-400">
              Bawa ringkasan gejala dan 3 pertanyaan ini saat konsultasi.
            </p>
            <button
              type="button"
              onClick={() => setShowDoctorSummary(true)}
              className={buttonClass('secondary', 'sm', 'mt-3')}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Lihat ringkasan
            </button>
          </section>

          {/* 9. Check-in kecemasan sesudah hasil */}
          <section aria-labelledby="sesudah-heading" className="space-y-3">
            <div>
              <h2 id="sesudah-heading" className="text-sm font-semibold text-ink-900">
                Bagaimana perasaanmu sekarang?
              </h2>
              <p className="mt-1 text-xs leading-5 text-ink-400">
                Mengisi ini membantu kamu melihat perubahan rasa cemas, sebelum dan sesudah membaca hasil.
              </p>
            </div>
            <AnxietyCheckin
              value={anxietyAfter ?? anxietyBefore ?? 3}
              onChange={setAnxietyAfter}
              title="Seberapa cemas sekarang?"
              helper="Alat bantu refleksi, bukan diagnosis. Pilih angka yang paling mendekati."
            />
            {anxietyAfter !== null && anxietyBefore != null && (
              <p aria-live="polite" className="flex items-start gap-2 text-sm leading-6 text-ink-600">
                <Wind className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                {anxietyAfter < anxietyBefore
                  ? 'Rasa cemasmu sedikit turun. Tetap ikuti langkah di atas dan pantau gejalanya.'
                  : 'Terima kasih sudah mencatat. Kalau rasa cemas masih kuat, coba latihan napas atau ceritakan ke orang yang kamu percaya.'}
              </p>
            )}
          </section>

          {/* 10. Disclaimer selalu terlihat */}
          <Disclaimer />
        </div>
      </article>

      {showDoctorSummary && (
        <DoctorSummaryModal
          doctorSummary={result.doctorSummary}
          urgencyLabel={meta.label}
          onClose={() => setShowDoctorSummary(false)}
        />
      )}
    </div>
  );
}
