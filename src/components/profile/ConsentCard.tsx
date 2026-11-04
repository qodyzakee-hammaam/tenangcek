'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/supabase/client';

/**
 * Persetujuan penyimpanan data kesehatan (docs/database.md §6).
 * Tanpa izin ini, server menolak menulis sesi triage, check-in, dan diary.
 */
export default function ConsentCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!user) return null;

  const consented = profile?.consent_health_data === true;

  const updateConsent = async (next: boolean) => {
    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage('');

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/profile/consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ consent: next }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Izin penyimpanan belum bisa diperbarui.');
      }

      await refreshProfile();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Izin penyimpanan belum bisa diperbarui.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      id="privasi"
      aria-labelledby="privasi-heading"
      className="scroll-mt-24 rounded-card border border-border bg-surface p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${
            consented ? 'bg-brand-50 text-brand-600' : 'bg-canvas text-ink-400'
          }`}
        >
          {consented ? (
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ShieldOff className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <h2 id="privasi-heading" className="font-semibold text-ink-900">
            Izin simpan data kesehatan
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-400">
            {consented
              ? 'Aktif. Hasil cek gejala, check-in kecemasan, dan diary tersimpan di akunmu dan hanya bisa diakses olehmu.'
              : 'Nonaktif. Riwayat akun disembunyikan dan pengecekan baru tidak disimpan ke akun. Kamu tetap bisa memakai TenangCek sebagai tamu.'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void updateConsent(!consented)}
        disabled={isSaving}
        aria-pressed={consented}
        className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          consented
            ? 'border border-border bg-surface text-ink-600 hover:bg-canvas'
            : 'bg-brand-600 text-white hover:bg-brand-500'
        }`}
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSaving ? 'Menyimpan…' : consented ? 'Matikan izin penyimpanan' : 'Izinkan penyimpanan'}
      </button>

      <p className="mt-3 text-[11px] leading-5 text-ink-400">
        Kamu bisa mematikan izin ini kapan saja. Saat nonaktif, riwayat lama tidak ditampilkan.
        Data yang sudah tersimpan tetap bisa dihapus lewat diary atau dengan menghapus akun.
      </p>

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
