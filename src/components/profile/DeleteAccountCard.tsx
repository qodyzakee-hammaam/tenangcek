'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/supabase/client';

/**
 * Hapus akun (docs/database.md §6).
 * Route server menghapus data kesehatan lewat Prisma, lalu menghapus akun lewat
 * Supabase Admin; trigger `handle_deleted_user` menjadi jaring pengaman.
 */
export default function DeleteAccountCard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!user) return null;

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Akun belum bisa dihapus. Coba lagi nanti.');
      }

      await signOut();
      router.replace('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Akun belum bisa dihapus.');
      setIsDeleting(false);
    }
  };

  return (
    <section
      aria-labelledby="hapus-akun-heading"
      className="rounded-card border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-urgency-emergency" aria-hidden="true" />
        <h2 id="hapus-akun-heading" className="font-semibold text-ink-900">
          Hapus akun
        </h2>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-400">
        Menghapus akun akan menghapus profil, riwayat cek gejala, check-in, dan diary secara permanen.
      </p>

      {!isConfirming ? (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-urgency-emergency/30 px-4 py-2.5 text-sm font-semibold text-urgency-emergency-fg transition hover:bg-urgency-emergency-bg"
        >
          Hapus akun dan semua data
        </button>
      ) : (
        <div className="mt-4 rounded-control bg-urgency-emergency-bg p-3.5">
          <p className="text-xs leading-5 text-urgency-emergency-fg">
            Tindakan ini tidak bisa dibatalkan. Yakin ingin melanjutkan?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-urgency-emergency px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-urgency-emergency-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isDeleting ? 'Menghapus…' : 'Ya, hapus permanen'}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              disabled={isDeleting}
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-canvas disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-control bg-urgency-emergency-bg px-3 py-2 text-xs leading-5 text-urgency-emergency-fg"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </section>
  );
}
