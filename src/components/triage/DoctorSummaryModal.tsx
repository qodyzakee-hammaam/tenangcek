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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-summary-title"
        className="relative w-full max-w-lg rounded-card bg-surface p-6 shadow-xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2 text-ink-900">
            <Stethoscope className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h3 id="doctor-summary-title" className="font-bold text-base">Ringkasan Konsultasi Dokter</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup ringkasan"
            className="rounded-control p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-600 transition"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-xs text-ink-400">
          Bawa atau tunjukkan ringkasan ini saat bertemu tenaga kesehatan di puskesmas, klinik, atau rumah sakit untuk mempermudah komunikasi gejala secara runtut.
        </p>

        <div className="mt-4 rounded-control bg-canvas p-4 border border-border/80 text-xs text-ink-900 space-y-3 font-mono">
          <div>
            <span className="text-ink-400 block text-[10px] uppercase font-bold tracking-wider mb-1 font-sans">
              Gejala & Riwayat:
            </span>
            <p className="font-sans leading-relaxed text-ink-600">{doctorSummary.summary}</p>
          </div>

          <div>
            <span className="text-ink-400 block text-[10px] uppercase font-bold tracking-wider mb-1.5 font-sans">
              3 Pertanyaan yang Disarankan:
            </span>
            <ol className="list-decimal pl-4 space-y-1 font-sans text-ink-600">
              {doctorSummary.threeQuestionsForDoctor?.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-control bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-500 transition"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Tersalin ke Clipboard!' : 'Salin Ringkasan'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control border border-border px-4 py-2 text-xs font-medium text-ink-600 hover:bg-canvas transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
