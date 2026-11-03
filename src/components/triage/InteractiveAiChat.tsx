'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SymptomPayload, TriageResult, UrgencyLevel, UrgencyMeta } from '@/types/triage';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Loader2,
  Wind,
  RotateCcw,
  AlertTriangle,
  HeartPulse,
  FileCheck2,
  CheckCircle2,
  ShieldAlert,
  CalendarCheck,
  Home,
  Clock,
  ArrowLeft,
  ChevronRight,
  Info,
  LayoutDashboard,
} from 'lucide-react';
import DoctorLetterModal from './DoctorLetterModal';
import BreathingExercise from '../calm/BreathingExercise';
import RedFlagAlert from './RedFlagAlert';
import AutoGrowTextarea from '../ui/AutoGrowTextarea';
import { PRIMARY_EMERGENCY_CONTACT } from '@/content/emergency';
import { DoctorLetterData } from '@/app/api/chat/letter/route';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Props {
  result: TriageResult;
  formData: SymptomPayload;
  onReset: () => void;
}

const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyMeta> = {
  darurat: {
    level: 'darurat',
    label: 'Darurat',
    badgeColor: 'bg-urgency-emergency-bg text-urgency-emergency-fg ring-1 ring-urgency-emergency/30',
    borderColor: 'border-urgency-emergency/40',
    bgColor: 'bg-urgency-emergency-bg',
    actionText: 'Ke IGD sekarang',
    timeframe: 'Sekarang',
  },
  segera: {
    level: 'segera',
    label: 'Segera',
    badgeColor: 'bg-urgency-urgent-bg text-urgency-urgent-fg ring-1 ring-urgency-urgent/30',
    borderColor: 'border-urgency-urgent/40',
    bgColor: 'bg-urgency-urgent-bg',
    actionText: 'Periksa ke dokter dalam 24 jam',
    timeframe: 'Dalam 24 jam',
  },
  terjadwal: {
    level: 'terjadwal',
    label: 'Terjadwal',
    badgeColor: 'bg-urgency-scheduled-bg text-urgency-scheduled-fg ring-1 ring-urgency-scheduled/30',
    borderColor: 'border-urgency-scheduled/40',
    bgColor: 'bg-urgency-scheduled-bg',
    actionText: 'Buat janji pemeriksaan dalam beberapa hari',
    timeframe: 'Beberapa hari',
  },
  pantau_di_rumah: {
    level: 'pantau_di_rumah',
    label: 'Pantau di rumah',
    badgeColor: 'bg-urgency-monitor-bg text-urgency-monitor-fg ring-1 ring-urgency-monitor/30',
    borderColor: 'border-urgency-monitor/40',
    bgColor: 'bg-urgency-monitor-bg',
    actionText: 'Pantau gejala dan waspadai tanda eskalasi',
    timeframe: 'Rawat mandiri',
  },
};

const SUGGESTED_QUESTIONS = [
  'Apa pertolongan pertama yang bisa saya lakukan?',
  'Makanan & minuman apa yang dianjurkan?',
  'Kapan tanda bahaya yang harus segera ke dokter?',
  'Bagaimana menyiapkan diri sebelum ke dokter?',
  'Bagaimana agar tidak cemas dan overthinking?',
];

function UrgencyIcon({ level }: { level: UrgencyLevel }) {
  switch (level) {
    case 'darurat': return <ShieldAlert className="h-5 w-5 text-urgency-emergency" />;
    case 'segera': return <AlertTriangle className="h-5 w-5 text-urgency-urgent" />;
    case 'terjadwal': return <CalendarCheck className="h-5 w-5 text-urgency-scheduled" />;
    default: return <Home className="h-5 w-5 text-urgency-monitor" />;
  }
}

export default function InteractiveAiChat({ result, formData, onReset }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasResponseStarted, setHasResponseStarted] = useState(false);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [doctorLetter, setDoctorLetter] = useState<DoctorLetterData | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [isLiveGemini, setIsLiveGemini] = useState<boolean | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'triase' | 'napas'>('triase');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const meta = URGENCY_CONFIG[result.urgencyLevel] ?? URGENCY_CONFIG.pantau_di_rumah;
  // Nama model mengikuti header dari server, bukan versi yang di-hardcode.
  const modelLabel = aiModel ? (/lite/i.test(aiModel) ? 'Gemini Flash Lite' : 'Gemini Flash') : 'Gemini';

  // Pesan sambutan awal
  useEffect(() => {
    const welcome = `Halo! Saya **TenangCek AI Companion** 🌿

Saya sudah menerima dan menganalisis keluhan **${formData.mainSymptom}** Anda (durasi: ${formData.duration || 'beberapa hari'}, intensitas: ${formData.severity || 'sedang'}).

**Hasil Penilaian Awal:** Status Anda — **${meta.label}**.
${result.reasoning}

**Langkah Awal yang Disarankan:**
${result.nextSteps?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${result.calmSupport?.message ? `💡 *${result.calmSupport.message}*` : ''}

Silakan tanyakan apa saja yang masih membuat Anda khawatir. Setelah selesai, klik **"Akhiri & Surat Dokter"** untuk mendapatkan lembar rangkuman resmi bagi dokter.`;

    setMessages([
      {
        id: 'msg-init',
        role: 'assistant',
        content: welcome,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [formData, result, meta]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const next = [...messages, userMsg];
    setMessages(next);
    setInputText('');
    setIsLoading(true);
    setHasResponseStarted(false);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          triageContext: {
            mainSymptom: formData.mainSymptom,
            duration: formData.duration,
            severity: formData.severity,
            accompanyingSymptoms: formData.accompanyingSymptoms,
            urgencyLevel: result.urgencyLevel,
            reasoning: result.reasoning,
            nextSteps: result.nextSteps,
            doctorSummary: result.doctorSummary,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || 'Gagal mendapat respons AI');
      }

      const isGemini = res.headers.get('x-ai-provider') === 'gemini';
      setIsLiveGemini(isGemini);
      setAiModel(res.headers.get('x-ai-model'));
      if (!res.body) throw new Error('Respons AI kosong');

      const assistantId = `msg-${Date.now()}-ai`;
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let streamedText = '';
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.length) setHasResponseStarted(true);
        streamedText += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((message) =>
          message.id === assistantId ? { ...message, content: streamedText } : message
        ));
      }
      streamedText += decoder.decode();
      if (streamedText) {
        setMessages((prev) => prev.map((message) =>
          message.id === assistantId ? { ...message, content: streamedText } : message
        ));
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Gangguan jaringan';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `Maaf, terjadi kendala: ${errText}. Pastikan tubuh Anda beristirahat cukup dan coba kirim ulang pertanyaan.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setHasResponseStarted(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleEndChat = async () => {
    setIsGeneratingLetter(true);
    try {
      const res = await fetch('/api/chat/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          triageContext: {
            mainSymptom: formData.mainSymptom,
            duration: formData.duration,
            severity: formData.severity,
            accompanyingSymptoms: formData.accompanyingSymptoms,
            urgencyLevel: result.urgencyLevel,
            reasoning: result.reasoning,
            nextSteps: result.nextSteps,
            doctorSummary: result.doctorSummary,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal membuat surat');
      setDoctorLetter(json.letter);
    } catch (err) {
      console.error('Letter gen error:', err);
      const now = new Date();
      setDoctorLetter({
        documentId: `TC-${now.getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`,
        generatedAt: now.toLocaleString('id-ID'),
        patientOverview: {
          mainSymptom: formData.mainSymptom,
          duration: formData.duration || 'Beberapa saat',
          severity: formData.severity || 'sedang',
          accompanyingSymptoms: formData.accompanyingSymptoms || [],
          urgencyLevel: result.urgencyLevel,
          urgencyLabel: meta.label,
        },
        clinicalSummary: `Pasien mengalami ${formData.mainSymptom} selama ${formData.duration || 'beberapa hari'}, keparahan ${formData.severity || 'sedang'}. Telah dilakukan pemilahan triase dan konsultasi awal via TenangCek.`,
        chatInsights: [
          `Keluhan utama: ${formData.mainSymptom}`,
          `Durasi: ${formData.duration || 'Beberapa hari'}`,
          `Tingkat urgensi: ${meta.label}`,
        ],
        dangerSignsToWatch: [
          'Peningkatan intensitas rasa sakit signifikan',
          'Sesak napas atau demam tinggi berkelanjutan',
        ],
        homeCareTried: ['Istirahat fisik & hidrasi', 'Pemantauan harian tanda eskalasi gejala'],
        suggestedQuestionsForDoctor: [
          'Apakah perlu pemeriksaan laboratorium atau diagnostik penunjang?',
          'Kapan batas aman gejala ini mereda?',
          'Adakah pantangan aktivitas atau makanan?',
        ],
        doctorNoteClosing: 'Catatan mandiri pasien disusun oleh TenangCek AI Companion.',
      });
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // Render markdown sederhana
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-sm">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**'))
              return <strong key={pIdx} className="font-bold text-ink-900">{part.slice(2, -2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*'))
              return <em key={pIdx} className="italic text-ink-600">{part.slice(1, -1)}</em>;
            return part;
          });

          if (line.trim().startsWith('- ') || line.trim().startsWith('* '))
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-brand-500 font-bold mt-0.5">•</span>
                <span>{parts}</span>
              </div>
            );

          if (/^\d+\.\s/.test(line.trim()))
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span>{parts}</span>
              </div>
            );

          return <p key={idx}>{parts}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">

      {/* ══════════════════════════════════════════
          SIDEBAR KIRI — Info Triase
      ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-r border-border bg-surface overflow-y-auto">

        {/* Sidebar Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 text-ink-400 hover:text-brand-600 transition text-xs mb-4">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Dashboard
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-500 text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm leading-tight">TenangCek</p>
              <p className="text-[11px] text-ink-400">AI Health Triage</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => setSidebarTab('triase')}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${
              sidebarTab === 'triase'
                ? 'text-brand-600 border-b-2 border-brand-500'
                : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            Rincian Triase
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('napas')}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${
              sidebarTab === 'napas'
                ? 'text-brand-600 border-b-2 border-brand-500'
                : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            Relaksasi Napas
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'triase' ? (
            <div className="p-4 space-y-4">

              {/* Urgency Badge */}
              <div className={`rounded-control p-4 ${meta.bgColor} border ${meta.borderColor}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface shadow-xs">
                    <UrgencyIcon level={result.urgencyLevel} />
                  </div>
                  <div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${meta.badgeColor}`}>
                      {meta.label}
                    </span>
                    <p className="text-[11px] text-ink-600 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {meta.timeframe}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-ink-600 font-medium bg-surface/80 rounded-lg px-3 py-2">
                  {meta.actionText}
                </p>
              </div>

              {/* Keluhan Pasien */}
              <div className="rounded-control border border-border bg-canvas p-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase text-ink-400 tracking-wide">Keluhan Pasien</p>
                <div className="space-y-1.5 text-xs text-ink-600">
                  <p><span className="text-ink-400">Gejala:</span> <strong>{formData.mainSymptom}</strong></p>
                  {formData.duration && <p><span className="text-ink-400">Durasi:</span> {formData.duration}</p>}
                  {formData.severity && <p><span className="text-ink-400">Keparahan:</span> {formData.severity}</p>}
                  {formData.accompanyingSymptoms && formData.accompanyingSymptoms.length > 0 && (
                    <p><span className="text-ink-400">Gejala penyerta:</span> {formData.accompanyingSymptoms.join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Alasan */}
              <div>
                <p className="text-[11px] font-bold uppercase text-ink-400 tracking-wide mb-1.5">Analisis AI</p>
                <p className="text-xs text-ink-600 leading-relaxed bg-surface border border-border rounded-control p-3">
                  {result.reasoning}
                </p>
              </div>

              {/* Langkah Berikutnya */}
              {result.nextSteps && result.nextSteps.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase text-ink-400 tracking-wide mb-1.5">Langkah Berikutnya</p>
                  <div className="space-y-1.5">
                    {result.nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink-600">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tanda Bahaya */}
              {result.dangerSignsToWatch && result.dangerSignsToWatch.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase text-urgency-emergency tracking-wide mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Tanda Bahaya
                  </p>
                  <ul className="space-y-1 rounded-control bg-urgency-emergency-bg border border-urgency-emergency/20 p-3 text-xs text-urgency-emergency-fg">
                    {result.dangerSignsToWatch.map((sign, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-urgency-emergency shrink-0" />
                        {sign}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Calm Support */}
              {result.calmSupport?.message && (
                <div className="rounded-control border border-brand-100 bg-brand-50 p-3 text-xs text-ink-600 flex items-start gap-2">
                  <span className="text-base shrink-0">🌿</span>
                  <p className="leading-relaxed">{result.calmSupport.message}</p>
                </div>
              )}

              {/* Engine info */}
              <div className="text-[11px] text-ink-400 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-brand-500" />
                {isLiveGemini === true ? `Powered by ${modelLabel}` : isLiveGemini === false ? 'AI Health Engine (fallback)' : 'TenangCek AI'}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <BreathingExercise />
            </div>
          )}
        </div>

        {/* Sidebar Footer Buttons */}
        <div className="shrink-0 border-t border-border p-4 space-y-2">
          <button
            type="button"
            onClick={handleEndChat}
            disabled={isGeneratingLetter}
            className="w-full flex items-center justify-center gap-2 rounded-control bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-50 transition shadow-sm"
          >
            {isGeneratingLetter ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Menyusun Surat...</>
            ) : (
              <><FileCheck2 className="h-4 w-4" />Akhiri & Buat Surat Dokter</>
            )}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 py-2 text-xs font-medium text-ink-600 hover:bg-canvas transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Gejala Baru
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          CHAT PANEL KANAN — Full Height
      ══════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Chat Top Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 shrink-0">
          {/* Mobile: Back + brand */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              aria-label="Kembali ke dashboard"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-ink-400 transition hover:bg-canvas lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-600 text-white shadow-sm">
                <Bot className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500 border-2 border-white" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink-900 text-sm truncate">TenangCek AI Companion</p>
                  <span className={`hidden sm:inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeColor}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-[11px] text-ink-400 truncate">
                  {formData.mainSymptom} • {formData.severity ?? 'sedang'} •{' '}
                  <span className="text-brand-600 font-semibold">
                    {isLiveGemini ? modelLabel : 'AI Engine'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile: Akhiri & Surat */}
            <button
              type="button"
              onClick={handleEndChat}
              disabled={isGeneratingLetter}
              className="flex items-center gap-1.5 rounded-control bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {isGeneratingLetter
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileCheck2 className="h-3.5 w-3.5" />
              }
              <span className="hidden sm:inline">Akhiri & Surat Dokter</span>
              <span className="sm:hidden">Surat</span>
            </button>
          </div>
        </div>

        {/* Red Flag Alert */}
        {result.isRedFlagTriggered && (
          <div className="px-4 py-3 bg-urgency-emergency-bg border-b border-urgency-emergency/25 shrink-0">
            <RedFlagAlert
              reason={result.reasoning}
              actionText={result.nextSteps?.[0] ?? `Segera ke IGD atau hubungi ${PRIMARY_EMERGENCY_CONTACT.number}`}
            />
          </div>
        )}

        {/* ── Chat Messages Area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-4 bg-canvas">

          {/* Session start indicator */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-3 py-1 text-[11px] font-semibold text-ink-400 shadow-xs">
              <HeartPulse className="h-3 w-3 text-brand-600" />
              Sesi Konsultasi Dimulai
            </span>
          </div>

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                    isUser ? 'bg-brand-500' : 'bg-ink-900'
                  }`}
                >
                  {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] sm:max-w-[72%] rounded-card px-4 py-3 shadow-xs ${
                    isUser
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-surface text-ink-900 border border-border rounded-bl-sm'
                  }`}
                >
                  {isUser
                    ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    : renderContent(msg.content)
                  }
                  <p className={`mt-1.5 text-[10px] text-right ${isUser ? 'text-brand-100' : 'text-ink-400'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && !hasResponseStarted && (
            <div className="flex items-end gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-card rounded-bl-sm bg-surface border border-border shadow-xs px-4 py-3 flex items-center gap-2 text-xs text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-600 shrink-0" />
                TenangCek sedang menyusun jawaban...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Chips ── */}
        <div className="relative shrink-0 border-t border-border bg-surface">
          <div className="overflow-x-auto overscroll-x-contain px-4 py-2 [scrollbar-width:thin]">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink-400">
                <Sparkles className="h-3 w-3 text-brand-500" />
                Tanya cepat:
              </span>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(q)}
                  className="min-h-9 shrink-0 rounded-full border border-border bg-canvas px-3 py-1 text-[11px] font-medium text-ink-600 transition hover:border-brand-500/50 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Input Bar ── */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="shrink-0 border-t border-border bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2">
            <AutoGrowTextarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                // Enter mengirim; Shift+Enter menambah baris baru.
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              disabled={isLoading}
              maxHeight={160}
              aria-label="Tulis pertanyaan untuk TenangCek AI"
              placeholder="Tanyakan keluhan Anda (misal: boleh minum es? kapan harus periksa?)..."
              className="min-h-11 min-w-0 flex-1 rounded-card border border-border bg-canvas px-4 py-2.5 text-base leading-6 text-ink-900 transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-50 disabled:opacity-60 sm:text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              aria-label="Kirim pesan"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-brand-500 text-white shadow-sm transition hover:bg-brand-500 disabled:opacity-40"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-ink-400">
            <span>
              <strong>Enter</strong> kirim
              <span className="hidden sm:inline">
                {' · '}
                <strong>Shift+Enter</strong> baris baru
              </span>
            </span>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 transition hover:text-ink-600"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Gejala
            </button>
          </div>
        </form>
      </div>

      {/* Doctor Letter Modal */}
      {doctorLetter && (
        <DoctorLetterModal
          letter={doctorLetter}
          onClose={() => setDoctorLetter(null)}
        />
      )}
    </div>
  );
}
