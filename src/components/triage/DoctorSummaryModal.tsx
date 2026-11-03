'use client';

import React, { useState } from 'react';
import { X, Copy, Check, FileDown, Stethoscope } from 'lucide-react';

interface Props {
  doctorSummary: {
    summary: string;
    threeQuestionsForDoctor: string[];
  };
  urgencyLabel: string;
  onClose: () => void;
}

export default function DoctorSummaryModal({ doctorSummary, urgencyLabel, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const fullTextToCopy = `[Ringkasan Gejala TenangCek untuk Dokter]
Status Triage: ${urgencyLabel}

Ringkasan:
${doctorSummary.summary}

Pertanyaan yang Disiapkan untuk Konsultasi:
1. ${doctorSummary.threeQuestionsForDoctor?.[0] || '-'}
2. ${doctorSummary.threeQuestionsForDoctor?.[1] || '-'}
3. ${doctorSummary.threeQuestionsForDoctor?.[2] || '-'}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullTextToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-3 backdrop-blur-xs sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-summary-title"
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex min-w-0 items-center gap-2 text-ink-900">
            <Stethoscope className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <h3 id="doctor-summary-title" className="text-base font-bold">Ringkasan Konsultasi Dokter</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup ringkasan"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-400 transition hover:bg-canvas hover:text-ink-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-xs text-ink-400">
          Bawa atau tunjukkan ringkasan ini saat bertemu tenaga kesehatan di puskesmas, klinik, atau rumah sakit untuk mempermudah komunikasi gejala secara runtut.
        </p>

        <div className="mt-4 space-y-3 rounded-control border border-border/80 bg-canvas p-4 font-mono text-xs text-ink-900">
          <div>
            <span className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Gejala & Riwayat:
            </span>
            <p className="break-words font-sans leading-relaxed text-ink-600">{doctorSummary.summary}</p>
          </div>

          <div>
            <span className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-400">
              3 Pertanyaan yang Disarankan:
            </span>
            <ol className="list-decimal space-y-1 pl-4 font-sans text-ink-600">
              {doctorSummary.threeQuestionsForDoctor?.map((q, idx) => (
                <li key={idx} className="break-words">{q}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-11 items-center gap-1.5 rounded-control bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-500"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Tersalin ke Clipboard!' : 'Salin Ringkasan'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-control border border-border px-4 py-2 text-xs font-medium text-ink-600 transition hover:bg-canvas"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
