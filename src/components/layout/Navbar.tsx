'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookHeart, HeartPulse, LayoutDashboard, LogIn, LogOut, PhoneCall } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { cn } from '@/lib/ui/cn';

export default function Navbar() {
  const { user, signOut, isLoading } = useAuth();
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
            <span className="block text-[10px] font-medium text-ink-400">Pahami keluhan. Tentukan langkah.</span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="flex items-center gap-0.5 sm:gap-2">
          <Link href="/dashboard" className={navClass('/dashboard')} aria-label="Riwayat">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Riwayat</span>
          </Link>
          <Link href="/diary" className={cn(navClass('/diary'), 'hidden sm:inline-flex')}>
            <BookHeart className="h-4 w-4" aria-hidden="true" />
            Diary
          </Link>
          <Link
            href="/crisis"
            className="flex h-11 w-11 items-center justify-center rounded-control text-urgency-emergency transition hover:bg-urgency-emergency-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            aria-label="Bantuan darurat"
            title="Bantuan darurat"
          >
            <PhoneCall className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/checkin" className={buttonClass('primary', 'sm', 'min-h-11')}>
            <HeartPulse className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Mulai cek</span>
            <span className="sm:hidden">Cek</span>
          </Link>
          {!isLoading && (
            user ? (
              <button
                type="button"
                onClick={() => signOut()}
                aria-label="Keluar dari akun"
                title="Keluar"
                className="ml-0.5 flex h-11 w-11 items-center justify-center rounded-control text-ink-400 transition hover:bg-canvas hover:text-ink-900 sm:ml-1"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <Link
                href="/auth"
                className="ml-0.5 flex min-h-11 items-center justify-center rounded-control px-2 text-ink-600 transition hover:bg-canvas hover:text-ink-900 sm:ml-1 sm:gap-2 sm:px-3"
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
