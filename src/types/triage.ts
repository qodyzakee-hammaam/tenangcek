/**
 * Definisi Tipe Data Triage TenangCek
 * Berdasarkan Konsep Desain Feedback & Arsitektur IMK (Halaman 3-5)
 */

export type UrgencyLevel = 'darurat' | 'segera' | 'terjadwal' | 'pantau_di_rumah';

/**
 * Asal penjelasan triage.
 * - `gemini`: model AI berhasil menjawab.
 * - `rule_based`: panduan standar TenangCek (mis. AI sedang sibuk atau tidak dikonfigurasi).
 * Keduanya melewati safety layer yang sama, jadi tingkat urgensi tidak berbeda.
 */
export type TriageSource = 'gemini' | 'rule_based';

export interface UrgencyMeta {
  level: UrgencyLevel;
  label: string;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
  actionText: string;
  timeframe: string;
}

export interface RedFlagRule {
  id: string;
  keywords: string[];
  description: string;
  severity: 'darurat';
  action: string;
}

export interface RedFlagCheckResult {
  hasRedFlag: boolean;
  matchedRule?: RedFlagRule;
  emergencyMessage?: string;
}

export interface SymptomPayload {
  mainSymptom: string;
  duration?: string;
  severity?: 'ringan' | 'sedang' | 'berat';
  accompanyingSymptoms?: string[];
  anxietyBefore?: number; // 1-5
  ageRange?: string;
  specialConditions?: string[];
  tonePreference?: 'santai' | 'formal';
  detailPreference?: 'ringkas' | 'detail';
}

export interface TriageResult {
  urgencyLevel: UrgencyLevel;
  reasoning: string;
  commonCauses: string[];
  dangerSignsToWatch: string[];
  nextSteps: string[];
  doctorSummary: {
    summary: string;
    threeQuestionsForDoctor: string[];
  };
  calmSupport: {
    message: string;
    suggestBreathingExercise: boolean;
  };
  isRedFlagTriggered?: boolean;
  confidenceNotes?: string;
}

export interface ChatStep {
  step: number;
  id: 'main_symptom' | 'duration' | 'severity' | 'accompanying' | 'anxiety';
  question: string;
  helperText?: string;
  quickOptions?: string[];
  type: 'text' | 'options' | 'rating';
}
