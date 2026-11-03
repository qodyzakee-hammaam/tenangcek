'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, RefreshCw, Wind } from 'lucide-react';

type Phase = 'tarik' | 'tahan' | 'hembuskan';

const PHASE_LABEL: Record<Phase, string> = {
  tarik: 'Tarik napas perlahan',
  tahan: 'Tahan sebentar',
  hembuskan: 'Hembuskan napas dengan rileks',
};

const PHASE_CLASS: Record<Phase, string> = {
  tarik: 'bg-brand-500 scale-110',
  tahan: 'bg-brand-600 scale-110',
  hembuskan: 'bg-brand-100 scale-100',
};

/** Latihan napas singkat (docs/design-system.md §3.5, §2.6). */
export default function BreathingExercise() {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('tarik');
  const [secondsLeft, setSecondsLeft] = useState(4);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === 'tarik') {
            setPhase('tahan');
            return 4;
          }
          if (phase === 'tahan') {
            setPhase('hembuskan');
            return 6;
          }
          setPhase('tarik');
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, phase]);

  return (
    <div className="rounded-card border border-brand-100 bg-brand-50 p-5 text-center sm:p-6">
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-600">
        <Wind className="h-4 w-4" aria-hidden="true" />
        <span>Latihan napas sejenak</span>
      </div>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-ink-600">
        Luangkan sekitar satu menit untuk mengatur ritme napas. Tidak ada paksaan — berhenti kapan saja kalau tidak nyaman.
      </p>

      <div className="relative mx-auto mt-6 flex h-40 w-40 items-center justify-center" aria-hidden="true">
        <div
          className={`absolute h-32 w-32 rounded-full opacity-20 transition-all duration-1000 ease-in-out motion-reduce:transition-none ${
            isActive ? PHASE_CLASS[phase] : 'bg-brand-500 scale-100'
          }`}
        />
        <div
          className={`flex h-24 w-24 flex-col items-center justify-center rounded-full text-white shadow-md transition-all duration-1000 ease-in-out motion-reduce:transition-none ${
            isActive ? PHASE_CLASS[phase] : 'bg-brand-600 scale-100'
          }`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider">{isActive ? phase : 'Mulai'}</span>
          <span className="text-2xl font-bold">{isActive ? secondsLeft : '4s'}</span>
        </div>
      </div>

      <p aria-live="polite" className="mt-4 h-6 text-sm font-medium text-ink-900">
        {isActive ? `${PHASE_LABEL[phase]} · ${secondsLeft} detik` : 'Tekan mulai saat kamu siap'}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {isActive ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {isActive ? 'Jeda' : 'Mulai latihan'}
        </button>

        {isActive && (
          <button
            type="button"
            onClick={() => {
              setPhase('tarik');
              setSecondsLeft(4);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink-600 transition hover:bg-canvas"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Ulangi
          </button>
        )}
      </div>
    </div>
  );
}
