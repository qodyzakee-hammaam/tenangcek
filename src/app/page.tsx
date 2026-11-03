'use client';

import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  BookHeart,
  Check,
  ClipboardList,
  HeartPulse,
  MessageCircleHeart,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UrgencyBadge from '@/components/result/UrgencyBadge';

const steps = [
  { number: '01', title: 'Ceritain yang kamu rasain', text: 'Jawab beberapa pertanyaan singkat tentang gejala, durasi, dan seberapa mengganggu aktivitasmu.' },
  { number: '02', title: 'Lihat tingkat urgensinya', text: 'TenangCek bantu mengenali tanda bahaya dan memberi saran kapan sebaiknya mencari bantuan medis.' },
  { number: '03', title: 'Pilih langkah berikutnya', text: 'Dapatkan saran perawatan awal, catat perkembangan, atau bawa ringkasan saat konsultasi.' },
];

const features = [
  { icon: ClipboardList, title: 'Cek keluhan dengan terarah', text: 'Mulai dari gejala yang paling terasa. Pertanyaannya dibuat bertahap supaya nggak bikin kewalahan.' },
  { icon: BookHeart, title: 'Pantau dari hari ke hari', text: 'Catat perubahan gejala di diary pribadi dan lihat kembali riwayat pengecekanmu.' },
  { icon: MessageCircleHeart, title: 'Siapkan obrolan dengan dokter', text: 'Bawa ringkasan gejala dan pertanyaan penting agar konsultasi terasa lebih siap.' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="overflow-hidden bg-canvas text-ink-900">
      <section className="relative border-b border-border bg-canvas">
        <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-2 text-xs font-semibold text-ink-900 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Teman buat memahami langkah berikutnya
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-ink-900 sm:text-5xl lg:text-[3.65rem]">
              Lagi nggak enak badan? <span className="text-brand-600">Mulai dari yang kamu rasain.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink-600 sm:text-lg">
              TenangCek bantu kamu memahami seberapa cepat keluhan perlu ditangani dan apa yang bisa dilakukan selanjutnya—tanpa harus menebak-nebak sendiri.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/checkin" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
                Mulai cek gejala
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#cara-kerja" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-border bg-surface/70 px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-surface">
                Lihat cara kerjanya <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-4 text-xs leading-5 text-ink-400">
              Gratis untuk mulai. Tidak perlu akun untuk mengecek keluhan.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:ml-auto">
            <div className="absolute -left-5 top-10 h-24 w-24 rounded-full border border-border" aria-hidden="true" />
            <div className="relative rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_24px_80px_-36px_rgba(6,78,59,.35)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">Contoh tampilan</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink-900">Langkah yang bisa dipahami</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-card bg-brand-50 text-brand-600"><HeartPulse className="h-5 w-5" /></div>
              </div>
              <div className="mt-6 rounded-card bg-brand-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink-600">Tingkat urgensi</span>
                  <UrgencyBadge level="pantau_di_rumah" size="sm" />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-600">
                  Saran disertai alasan dan tanda yang perlu diperhatikan—bukan diagnosis penyakit.
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {['Saran langkah awal yang praktis', 'Tanda kapan perlu cari bantuan', 'Ringkasan yang bisa dibawa ke dokter'].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-ink-600"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Check className="h-3.5 w-3.5" /></span>{item}</div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-ink-400"><ShieldCheck className="h-4 w-4 text-brand-600" /> Informasi awal, bukan pengganti tenaga medis</div>
            </div>
            <div className="absolute -bottom-5 -right-3 hidden items-center gap-2 rounded-control border border-border bg-surface px-4 py-3 text-xs font-medium text-ink-900 shadow-lg sm:flex"><Wind className="h-4 w-4 text-brand-600" /> Ada ruang buat tarik napas juga.</div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Alurnya sederhana</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-ink-900 sm:text-4xl">Dari bingung jadi tahu mau ngapain.</h2>
          <p className="mt-3 text-base leading-7 text-ink-600">Nggak perlu ngerti istilah medis. Ceritakan dengan bahasamu sendiri, lalu ikuti panduan langkah demi langkah.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="rounded-card border border-border bg-surface p-6 shadow-sm">
              <span className="text-xs font-bold tracking-[.16em] text-brand-600">{step.number}</span>
              <h3 className="mt-4 text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Yang bisa kamu lakukan</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-ink-900 sm:text-4xl">Bukan cuma cek, tapi siap ambil langkah.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-ink-600">Simpan perkembanganmu, tenangkan diri, dan datang ke konsultasi dengan catatan yang lebih rapi.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-card bg-canvas p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-card bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-base font-semibold text-ink-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-card bg-ink-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-xl">
              <h3 className="text-xl font-semibold tracking-tight">Privasi dan batasannya jelas.</h3>
              <p className="mt-2 text-sm leading-6 text-brand-100/80">Riwayat pengecekan disimpan di browser perangkat ini. TenangCek memberi informasi awal, bukan diagnosis atau pengganti konsultasi medis.</p>
            </div>
            <Link href={user ? '/dashboard' : '/checkin'} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-white px-5 py-3 text-sm font-bold text-brand-600 transition hover:bg-brand-50">
              {user ? 'Buka riwayat' : 'Mulai cek gejala'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
