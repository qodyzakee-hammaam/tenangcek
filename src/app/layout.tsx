import type { Metadata, Viewport } from 'next';
import './globals.css';
import ShellLayout from '@/components/layout/ShellLayout';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'TenangCek — Pahami keluhan, tentukan langkah',
  description: 'Panduan awal untuk memahami urgensi keluhan kesehatan dan langkah berikutnya. Bukan pengganti diagnosis tenaga medis.',
};

/**
 * `viewportFit: 'cover'` membuat `env(safe-area-inset-*)` bekerja di perangkat
 * berponi, sehingga tombol di bagian bawah tidak tertutup home indicator.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8fafa',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="flex min-h-dvh flex-col bg-canvas text-ink-900 antialiased">
        <AuthProvider>
          <ShellLayout>
            {children}
          </ShellLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
