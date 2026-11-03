import Link from 'next/link';
import DiaryList from '@/components/diary/DiaryList';
import { ArrowLeft, BookHeart, Info } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';

export const metadata = {
  title: 'Diary Gejala • TenangCek',
  description: 'Catat perubahan gejala dan siapkan ringkasan untuk konsultasi.',
};

export default function DiaryPage() {
  return (
    <AuthGuard>
      <div className="min-h-[70vh] bg-canvas">
        <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-ink-400 transition hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Kembali ke dashboard</Link>
          <div className="mb-7 mt-7 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-brand-600"><BookHeart className="h-3.5 w-3.5" /> Ruang catatanmu</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-ink-900 sm:text-4xl">Pantau perubahan, pelan-pelan.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600 sm:text-base">Catat apa yang kamu rasakan hari ini. Perubahan kecil bisa membantu kamu menjelaskan kondisi saat berkonsultasi.</p>
          </div>
          <div className="mb-6 flex items-start gap-3 rounded-card border border-urgency-urgent/25 bg-urgency-urgent-bg p-4 text-sm text-urgency-urgent-fg">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-urgency-urgent" />
            <p className="leading-6"><strong>Catatan:</strong> Diary ini membantu merangkum perubahan, bukan menentukan diagnosis. Kalau gejala terasa berat, memburuk, atau membuatmu khawatir, hubungi tenaga medis.</p>
          </div>
          <DiaryList />
        </div>
      </div>
    </AuthGuard>
  );
}
