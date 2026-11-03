'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HeartPulse, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Mohon isi email dan kata sandi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const lower = error.message.toLowerCase();
          if (lower.includes('email not confirmed')) {
            setErrorMsg('Email belum dikonfirmasi! Silakan periksa inbox/spam email Anda untuk link konfirmasi, atau matikan opsi "Confirm email" di pengaturan Supabase.');
          } else if (lower.includes('invalid login credentials')) {
            setErrorMsg('Email atau kata sandi tidak cocok. Jika baru mendaftar, pastikan email sudah dikonfirmasi (atau matikan Confirm email di Supabase).');
          } else {
            setErrorMsg(error.message);
          }
        } else {
          router.push(redirectPath);
        }
      } else {
        const { error, session, user } = await signUp(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else if (user && (!user.identities || user.identities.length === 0)) {
          setErrorMsg('Email ini sudah terdaftar sebelumnya. Silakan beralih ke tab Masuk (Login) atau gunakan kata sandi yang sesuai.');
        } else if (!session) {
          // Supabase mewajibkan email confirmation
          setSuccessMsg('Pendaftaran berhasil! Email konfirmasi telah dikirim. Mohon buka email Anda dan klik tautan verifikasi sebelum masuk (atau matikan "Confirm email" di dashboard Supabase untuk testing).');
        } else {
          setSuccessMsg('Pendaftaran berhasil! Mengalihkan ke dashboard...');
          setTimeout(() => {
            router.push(redirectPath);
          }, 1200);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto my-12 max-w-md px-4 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_24px_80px_-44px_rgba(6,78,59,.35)]">
        {/* Header Tab */}
        <div className="bg-brand-50 p-6 pb-4 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-brand-600 text-white shadow-xs">
              <HeartPulse className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-ink-900">
              TenangCek
            </span>
          </Link>
          <h1 className="text-base font-bold text-ink-900">
            {isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Pribadi'}
          </h1>
          <p className="mt-1 text-xs text-ink-400">
            {isLogin
              ? 'Masuk untuk mengakses riwayat triage & diary gejala'
              : 'Daftar untuk mulai cek keluhan kesehatan dengan aman'}
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-control bg-canvas/80 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
              }}
              className={`rounded-lg py-2 transition ${
                isLogin ? 'bg-surface text-brand-600 shadow-2xs font-bold' : 'text-ink-400 hover:text-ink-900'
              }`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
              }}
              className={`rounded-lg py-2 transition ${
                !isLogin ? 'bg-surface text-brand-600 shadow-2xs font-bold' : 'text-ink-400 hover:text-ink-900'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-control bg-urgency-emergency-bg p-3 text-xs text-urgency-emergency-fg border border-urgency-emergency/25">
              <AlertCircle className="h-4 w-4 shrink-0 text-urgency-emergency mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-control bg-brand-50 p-3 text-xs text-brand-600 border border-border">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-control border border-border py-2.5 pl-10 pr-4 text-xs sm:text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-50 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-control border border-border py-2.5 pl-10 pr-4 text-xs sm:text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-50 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-control bg-brand-500 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {isSubmitting ? (
              'Memproses...'
            ) : isLogin ? (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Buat Akun TenangCek</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="text-xs text-ink-400 hover:text-ink-600 transition"
            >
              ← Kembali ke Beranda Informasi
            </Link>
          </div>
        </form>

        {/* Privacy Note */}
        <div className="border-t border-border bg-canvas/70 p-4 text-center">
          <p className="text-[11px] text-ink-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            Privasi data kesehatan dilindungi Row Level Security (RLS).
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-ink-400">Memuat halaman login...</div>}>
      <AuthContent />
    </Suspense>
  );
}
