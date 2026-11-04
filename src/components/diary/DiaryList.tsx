'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import type { DiaryEntry } from '@/types/user';
import { AlertCircle, BookHeart, Clock, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/supabase/client';

const GUEST_STORAGE_KEY = 'tenangcek_diary_guest';

function readGuestEntries(): DiaryEntry[] {
  try {
    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DiaryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeGuestEntries(entries: DiaryEntry[]) {
  try {
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Penyimpanan sementara bisa gagal (mode privat); tidak menghalangi pemakaian.
  }
}

export default function DiaryList() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [mode, setMode] = useState<'guest' | 'account'>('guest');
  const [note, setNote] = useState('');
  const [severity, setSeverity] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch('/api/diary', { headers: authHeaders, cache: 'no-store' });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Catatan belum bisa dimuat.');
        }

        if (json.mode === 'guest') {
          setMode('guest');
          setEntries(readGuestEntries());
        } else {
          setMode('account');
          setEntries(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        setErrorMessage('Catatan belum bisa dimuat. Periksa koneksi lalu coba lagi.');
      } finally {
        setIsLoading(false);
      }
    };
    void loadEntries();
  }, []);

  const handleGuestAdd = useCallback((entry: DiaryEntry) => {
    setEntries((current) => {
      const next = [entry, ...current];
      writeGuestEntries(next);
      return next;
    });
  }, []);

  /**
   * Hapus satu catatan. Mode tamu hanya menyentuh sessionStorage; mode akun
   * memanggil `DELETE /api/diary?id=…` yang sudah dibatasi kepemilikan di server.
   */
  const handleDelete = async (entry: DiaryEntry) => {
    if (deletingId === entry.id) return;

    setDeletingId(entry.id);
    setErrorMessage('');
    setInfoMessage('');

    try {
      if (mode === 'guest') {
        setEntries((current) => {
          const next = current.filter((item) => item.id !== entry.id);
          writeGuestEntries(next);
          return next;
        });
        setInfoMessage('Catatan dihapus dari perangkat ini.');
        return;
      }

      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/diary?id=${encodeURIComponent(entry.id)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Catatan belum bisa dihapus.');
      }

      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setInfoMessage('Catatan dihapus dari akunmu.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Catatan belum bisa dihapus. Periksa koneksi lalu coba lagi.'
      );
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleClearAll = async () => {
    if (isClearing) return;

    setIsClearing(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      if (mode === 'guest') {
        writeGuestEntries([]);
        setEntries([]);
        setIsConfirmingClear(false);
        setInfoMessage('Semua catatan di perangkat ini sudah dihapus.');
        return;
      }

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/diary?all=1', { method: 'DELETE', headers: authHeaders });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Catatan belum bisa dihapus semua.');
      }

      setEntries([]);
      setIsConfirmingClear(false);
      setInfoMessage('Semua catatan di akunmu sudah dihapus.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Catatan belum bisa dihapus semua. Coba lagi.'
      );
    } finally {
      setIsClearing(false);
    }
  };

  const handleAddEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    const trimmedNote = note.trim();

    try {
      // Mode tamu: tidak menulis ke database (docs/database.md §6).
      if (mode === 'guest') {
        handleGuestAdd({
          id: `guest-${Date.now()}`,
          note: trimmedNote,
          severity,
          created_at: new Date().toISOString(),
        });
        setNote('');
        setSeverity(2);
        setInfoMessage('Tersimpan di perangkat ini saja dan hilang saat tab ditutup.');
        return;
      }

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ note: trimmedNote, severity }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Catatan belum tersimpan. Coba lagi.');
      }

      setEntries((current) => [json.data, ...current]);
      setNote('');
      setSeverity(2);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Catatan belum tersimpan. Periksa koneksi lalu coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityBadge = (value: number | null) => {
    if (value === null) {
      return (
        <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-400">
          Tanpa skala
        </span>
      );
    }
    const tone =
      value <= 2
        ? 'bg-brand-50 text-brand-600'
        : value === 3
          ? 'bg-urgency-urgent-bg text-urgency-urgent-fg'
          : 'bg-urgency-emergency-bg text-urgency-emergency-fg';
    const label = value <= 2 ? 'Ringan' : value === 3 ? 'Sedang' : 'Berat';
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
        {label} · {value}/5
      </span>
    );
  };

  const consentMissing = Boolean(user) && profile?.consent_health_data !== true;

  return (
    <div className="space-y-8">
      {!user && (
        <div className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 text-xs leading-5 text-ink-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <p>
            Mode tamu: catatan hanya tersimpan di perangkat ini selama tab terbuka dan tidak dikirim
            ke database.
            <Link
              href="/auth"
              className="ml-1 font-semibold text-brand-600 underline underline-offset-2"
            >
              Masuk
            </Link>{' '}
            bila ingin menyimpan permanen.
          </p>
        </div>
      )}

      {consentMissing && (
        <div className="flex items-start gap-3 rounded-card border border-urgency-urgent/25 bg-urgency-urgent-bg p-4 text-xs leading-5 text-urgency-urgent-fg">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Kamu belum mengizinkan penyimpanan data kesehatan, jadi catatan belum bisa disimpan ke
            akun.
            <Link
              href="/profile#privasi"
              className="ml-1 font-semibold underline underline-offset-2"
            >
              Atur izin di Profil
            </Link>
            .
          </p>
        </div>
      )}

      <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
            <BookHeart className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink-900">Catat kondisi hari ini</h2>
            <p className="mt-1 text-xs leading-5 text-ink-400">
              Tulis perubahan yang paling terasa, sekecil apa pun.
            </p>
          </div>
        </div>
        <form onSubmit={handleAddEntry} className="space-y-4">
          <textarea
            aria-label="Catatan perkembangan gejala"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Contoh: Kepala masih agak sakit, tapi lebih ringan setelah istirahat."
            className="w-full resize-y rounded-control border border-border bg-surface p-3.5 text-sm leading-6 text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-50"
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-ink-600">
                Seberapa mengganggu? <span className="text-ink-400">(1–5)</span>
              </legend>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Tingkat ${value} dari 5`}
                    aria-pressed={severity === value}
                    onClick={() => setSeverity(value)}
                    className={`h-9 w-9 rounded-control text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${severity === value ? 'bg-brand-600 text-white' : 'bg-canvas text-ink-600 hover:bg-canvas'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Menyimpan…' : 'Simpan catatan'}
            </button>
          </div>
          {errorMessage && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-control bg-urgency-emergency-bg px-3.5 py-3 text-sm text-urgency-emergency-fg"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {errorMessage}
            </p>
          )}
          {infoMessage && (
            <p
              aria-live="polite"
              className="rounded-control bg-brand-50 px-3.5 py-3 text-xs leading-5 text-ink-600"
            >
              {infoMessage}
            </p>
          )}
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">
              Riwayat kamu
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">
              Catatan perkembangan{' '}
              <span className="text-sm font-medium text-ink-400">({entries.length})</span>
            </h2>
          </div>

          {!isLoading && entries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {isConfirmingClear ? (
                <>
                  <span className="text-xs font-medium text-ink-600">Hapus semua catatan?</span>
                  <button
                    type="button"
                    onClick={() => void handleClearAll()}
                    disabled={isClearing}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-urgency-emergency px-3 py-2 text-xs font-semibold text-white transition hover:bg-urgency-emergency-fg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isClearing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isClearing ? 'Menghapus…' : 'Ya, hapus semua'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClear(false)}
                    disabled={isClearing}
                    className="inline-flex min-h-10 items-center rounded-control border border-border px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingClear(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-border px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-urgency-emergency/40 hover:bg-urgency-emergency-bg hover:text-urgency-emergency-fg"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Hapus semua
                </button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-card border border-border bg-surface p-6 text-sm text-ink-400">
            Memuat catatan…
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="font-semibold text-ink-900">Belum ada catatan</p>
            <p className="mt-1 text-sm text-ink-400">Catatan pertamamu akan muncul di sini.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-card border border-border bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {new Date(entry.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex items-center gap-2">
                  {severityBadge(entry.severity)}
                  {confirmDeleteId === entry.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry)}
                        disabled={deletingId === entry.id}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-control bg-urgency-emergency px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-urgency-emergency-fg disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === entry.id && (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        )}
                        {deletingId === entry.id ? 'Menghapus…' : 'Hapus'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === entry.id}
                        className="inline-flex min-h-9 items-center rounded-control border border-border px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Batal
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(entry.id)}
                      aria-label="Hapus catatan ini"
                      title="Hapus catatan"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-400 transition hover:bg-urgency-emergency-bg hover:text-urgency-emergency-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <p className="break-words text-sm leading-6 text-ink-600">{entry.note}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
