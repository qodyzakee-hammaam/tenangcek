'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Printer, 
  Copy, 
  Check, 
  X, 
  HeartPulse, 
  Stethoscope, 
  AlertTriangle, 
  HelpCircle, 
  CheckCircle2, 
  FileText,
  LayoutDashboard,
  MessageSquare
} from 'lucide-react';
import { DoctorLetterData } from '@/app/api/chat/letter/route';

interface Props {
  letter: DoctorLetterData;
  onClose: () => void;
}

export default function DoctorLetterModal({ letter, onClose }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'darurat':
        return 'bg-urgency-emergency text-white border-urgency-emergency-fg';
      case 'segera':
        return 'bg-urgency-urgent text-white border-urgency-urgent';
      case 'terjadwal':
        return 'bg-urgency-scheduled text-white border-urgency-scheduled';
      case 'pantau_di_rumah':
      default:
        return 'bg-brand-500 text-white border-brand-600';
    }
  };

  const fullTextToCopy = `=====================================================
LEMBAR CATATAN KELUHAN PASIEN & PENGANTAR KONSULTASI MEDIS
Dihasilkan oleh: TenangCek AI Health Companion
=====================================================

No. Dokumen : ${letter.documentId}
Tanggal     : ${letter.generatedAt}
Kategori    : ${letter.patientOverview.urgencyLabel}

A. DATA ANAMNESIS AWAL:
- Keluhan Utama    : ${letter.patientOverview.mainSymptom}
- Durasi Gejala    : ${letter.patientOverview.duration}
- Tingkat Gangguan : ${letter.patientOverview.severity}
- Gejala Penyerta  : ${letter.patientOverview.accompanyingSymptoms.join(', ') || 'Tidak ada keluhan penyerta'}

B. IKHTISAR KLINIS UNTUK DOKTER:
${letter.clinicalSummary}

C. POIN PENTING DARI PERCAKAPAN PASIEN:
${letter.chatInsights.map((pt, i) => `${i + 1}. ${pt}`).join('\n')}

D. TINDAKAN MANDIRI YANG SUDAH DILAKUKAN DI RUMAH:
${letter.homeCareTried.map((hc, i) => `- ${hc}`).join('\n')}

E. TANDA BAHAYA (RED FLAGS) YANG PERLU DIOBSERVASI:
${letter.dangerSignsToWatch.map((ds, i) => `! ${ds}`).join('\n')}

F. PERTANYAAN PASIEN UNTUK KONSULTASI:
${letter.suggestedQuestionsForDoctor.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Catatan:
${letter.doctorNoteClosing}
=====================================================`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullTextToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Gagal menyalin teks surat:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAndDashboard = () => {
    // Simpan ringkasan surat ke riwayat sesi jika diperlukan
    try {
      const cacheKey = `tenangcek_doctor_letters`;
      const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      localStorage.setItem(cacheKey, JSON.stringify([letter, ...existing]));
    } catch (e) {
      console.warn('Gagal menyimpan surat ke cache', e);
    }
    router.push('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-surface print:static print:inset-auto">
      <div className="relative w-full max-w-3xl rounded-card bg-surface shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none">
        
        {/* Modal Top Bar (Hidden saat di-print) */}
        <div className="flex items-center justify-between border-b border-border bg-canvas/80 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-xs">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-900">
                Surat Bahan Bacaan Dokter Pemeriksa
              </h2>
              <p className="text-[11px] text-ink-400">
                Dokumen ringkasan anamnesis & keluhan untuk dibawa ke klinik / faskes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-2xs hover:bg-canvas transition"
              title="Cetak atau Simpan sebagai PDF"
            >
              <Printer className="h-3.5 w-3.5 text-ink-400" />
              <span className="hidden sm:inline">Cetak / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-control bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-500 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-control p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-600 transition"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Isi Surat Medis (Print-Ready) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-ink-900 bg-surface print:p-0">
          
          {/* KOP SURAT MEDIS RESMI */}
          <div className="border-b-2 border-ink-900 pb-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-card bg-brand-500 text-white shadow-sm print:border print:border-brand-600">
                  <HeartPulse className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 block">
                    TenangCek Clinical Triage
                  </span>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-ink-900">
                    LEMBAR CATATAN KELUHAN PASIEN
                  </h1>
                  <p className="text-[11px] text-ink-400">
                    Bahan Bacaan & Anamnesis Awal untuk Dokter Pemeriksa di Faskes
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-ink-600 space-y-0.5">
                <p className="font-mono text-xs font-bold text-ink-900">
                  ID: {letter.documentId}
                </p>
                <p>{letter.generatedAt}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getUrgencyBadge(letter.patientOverview.urgencyLevel)}`}>
                  {letter.patientOverview.urgencyLabel}
                </span>
              </div>
            </div>
          </div>

          {/* TABEL DATA ANAMNESIS AWAL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-control bg-canvas border border-border/80 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">
                Keluhan Utama:
              </span>
              <span className="font-bold text-ink-900 text-sm">
                {letter.patientOverview.mainSymptom}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">
                Durasi Gejala:
              </span>
              <span className="font-semibold text-ink-900">
                {letter.patientOverview.duration}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">
                Derajat Gangguan:
              </span>
              <span className="font-semibold text-ink-900 capitalize">
                {letter.patientOverview.severity}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">
                Gejala Tambahan:
              </span>
              <span className="font-semibold text-ink-900">
                {letter.patientOverview.accompanyingSymptoms.join(', ') || 'Tidak ada'}
              </span>
            </div>
          </div>

          {/* BAGIAN I: IKHTISAR KLINIS NARATIF */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider border-b border-border pb-1">
              <Stethoscope className="h-4 w-4 text-brand-600" />
              <span>I. Ikhtisar Klinis Pasien (Clinical Summary)</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-ink-600 bg-brand-50/30 p-3.5 rounded-control border border-border/60 text-justify">
              {letter.clinicalSummary}
            </p>
          </div>

          {/* BAGIAN II: POIN KUNCI PERCAKAPAN PASIEN */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-600 uppercase tracking-wider border-b border-border pb-1">
              <MessageSquare className="h-4 w-4 text-ink-400" />
              <span>II. Poin Catatan dari Diskusi Pasien & Keluhan Spesifik</span>
            </div>
            <ul className="space-y-1.5 pl-2 text-xs sm:text-sm text-ink-600">
              {letter.chatInsights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-bold text-brand-600 shrink-0">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DUA KOLOM: TINDAKAN MANDIRI & TANDA BAHAYA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tindakan Mandiri */}
            <div className="rounded-control border border-urgency-scheduled/25 bg-urgency-scheduled-bg p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-urgency-scheduled-fg uppercase">
                <CheckCircle2 className="h-4 w-4 text-urgency-scheduled" />
                <span>Upaya Mandiri di Rumah</span>
              </div>
              <ul className="text-xs text-urgency-scheduled-fg space-y-1">
                {letter.homeCareTried.map((care, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-urgency-scheduled">✓</span>
                    <span>{care}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tanda Bahaya Yang Diamati */}
            <div className="rounded-control border border-urgency-urgent/25 bg-urgency-urgent-bg/40 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-urgency-urgent-fg uppercase">
                <AlertTriangle className="h-4 w-4 text-urgency-urgent" />
                <span>Tanda Bahaya yang Diobservasi</span>
              </div>
              <ul className="text-xs text-urgency-urgent-fg space-y-1">
                {letter.dangerSignsToWatch.map((danger, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-urgency-urgent font-bold">!</span>
                    <span>{danger}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* BAGIAN III: REKOMENDASI PERTANYAAN PASIEN KE DOKTER */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-1">
              <HelpCircle className="h-4 w-4 text-purple-600" />
              <span>III. Pertanyaan Terarah Pasien untuk Konsultasi Tatap Muka</span>
            </div>
            <p className="text-[11px] text-ink-400">
              Pertanyaan ini disiapkan sistem agar komunikasi pasien dan dokter di ruang periksa menjadi lebih efisien dan terfokus:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-ink-900 font-medium">
              {letter.suggestedQuestionsForDoctor.map((q, idx) => (
                <li key={idx} className="leading-snug">{q}</li>
              ))}
            </ol>
          </div>

          {/* FOOTER KOP & CATATAN PENUTUP */}
          <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-400">
            <p className="max-w-md italic leading-tight">
              {letter.doctorNoteClosing}
            </p>
            <div className="text-right">
              <span className="font-semibold text-ink-600 block">Sistem TenangCek Triase Medis</span>
              <span>Verifikasi Otomatis AI Triage</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls (Hidden saat di-print) */}
        <div className="border-t border-border bg-canvas px-6 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-control border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-canvas transition shadow-2xs"
          >
            <MessageSquare className="h-3.5 w-3.5 text-ink-400" />
            <span>Lanjut Obrolan Chat</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-control border border-brand-500/50 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-600 hover:bg-brand-100 transition"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Surat'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndDashboard}
              className="flex items-center gap-1.5 rounded-control bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-500 transition"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Simpan & Selesai</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
