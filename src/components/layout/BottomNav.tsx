'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookHeart, HeartPulse, LayoutDashboard, UserRound } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

/**
 * Navigasi bawah khusus layar kecil.
 *
 * - Muncul di semua halaman utama, tetapi disembunyikan saat pengguna berada di
 *   alur cek gejala dan autentikasi agar layar tetap fokus.
 * - "Cek" diletakkan di tengah sebagai aksi utama, sesuai kebiasaan satu tangan.
 */
const ITEMS = [
  { href: '/dashboard', label: 'Riwayat', icon: LayoutDashboard },
  { href: '/diary', label: 'Diary', icon: BookHeart },
  { href: '/profile', label: 'Profil', icon: UserRound },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname?.startsWith('/checkin') || pathname?.startsWith('/auth')) return null;

  const itemClass = (isActive: boolean) =>
    cn(
      'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-control px-1 text-[10px] font-semibold transition',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
      isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
    );

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 px-2 py-1.5">
        {ITEMS.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={itemClass(isActive)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}

        <Link
          href="/checkin"
          aria-label="Mulai cek gejala"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-control text-[10px] font-semibold text-ink-900"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-500">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </span>
          Cek
        </Link>

        {ITEMS.slice(2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={itemClass(isActive)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
