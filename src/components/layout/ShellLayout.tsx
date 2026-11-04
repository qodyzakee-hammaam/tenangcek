'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import DisclaimerBanner from './DisclaimerBanner';
import BottomNav from './BottomNav';

/** Route prefixes yang tidak memerlukan Navbar/Footer/BottomNav global. */
const FULLSCREEN_ROUTES = ['/checkin', '/auth'];

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some((route) => pathname?.startsWith(route));

  if (isFullscreen) {
    return (
      <div className="min-h-dvh w-full">
        {children}
      </div>
    );
  }

  return (
    <>
      <DisclaimerBanner />
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}
