import type { Metadata } from 'next';
import './globals.css';
import ShellLayout from '@/components/layout/ShellLayout';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'TenangCek — Pahami keluhan, tentukan langkah',
  description: 'Panduan awal untuk memahami urgensi keluhan kesehatan dan langkah berikutnya. Bukan pengganti diagnosis tenaga medis.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col bg-canvas text-ink-900 antialiased">
        <AuthProvider>
          <ShellLayout>
            {children}
          </ShellLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
