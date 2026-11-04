'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookHeart, HeartPulse, LayoutDashboard, LogIn, PhoneCall } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { cn } from '@/lib/ui/cn';

/**
 * Header global untuk layar sedang dan besar.
 *
 * Di ponsel, navigasi utama pindah ke `BottomNav`; header hanya menyisakan
 * identitas, bantuan darurat, dan pintu masuk ke profil. Tombol keluar tinggal
 * di Profil agar tidak mudah tertekan tanpa sengaja.
 */
export default function Navbar() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  const navClass = (href: string) =>
    cn(
      'inline-flex min-h-11 items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
      pathname === href ? 'bg-brand-50 text-ink-900' : 'text-ink-600 hover:bg-brand-50 hover:text-ink-900'
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="TenangCek beranda">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-600 text-white">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:block">
            <span className="block text-[15px] font-bold tracking-tight text-ink-900">TenangCek</span>
            <span className="block text-[10px] font-medium text-ink-400">
              Pahami keluhan. Tentukan langkah.
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-1 md:flex md:gap-1.5">
            <Link href="/dashboard" className={navClass('/dashboard')}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Riwayat
            </Link>
            <Link href="/diary" className={navClass('/diary')}>
              <BookHeart className="h-4 w-4" aria-hidden="true" />
              Diary
            </Link>
          </div>

          <Link
            href="/crisis"
            className="flex h-11 w-11 items-center justify-center rounded-control text-urgency-emergency transition hover:bg-urgency-emergency-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            aria-label="Bantuan darurat"
            title="Bantuan darurat"
          >
            <PhoneCall className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link href="/checkin" className={cn(buttonClass('primary', 'sm', 'min-h-11'), 'hidden md:inline-flex')}>
            <HeartPulse className="h-4 w-4" aria-hidden="true" />
            Mulai cek
          </Link>

          {!isLoading && (
            user ? (
              <Link
                href="/profile"
                aria-label="Buka profil"
                title="Profil"
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-500',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
                )}
              >
                {(user.email?.slice(0, 1) ?? 'P').toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/auth"
                className="flex min-h-11 items-center justify-center gap-2 rounded-control px-2 text-ink-600 transition hover:bg-canvas hover:text-ink-900 sm:px-3"
                aria-label="Masuk atau daftar"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span className="hidden text-sm font-medium sm:inline">Masuk</span>
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
