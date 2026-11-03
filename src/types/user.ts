/**
 * Profil Personalisasi User TenangCek
 * Minimal & opt-in untuk privasi kesehatan (docs/database.md §3.1)
 */

export interface UserProfile {
  id: string;
  age_range?: string | null;
  sex?: 'female' | 'male' | 'other' | 'prefer_not' | null;
  conditions?: string[];
  allergies?: string[];
  tone_pref?: 'casual' | 'formal';
  detail_pref?: 'brief' | 'detailed';
  region?: string | null;
  uses_bpjs?: boolean;
  budget_pref?: 'low' | 'medium' | 'flexible' | null;
  consent_health_data?: boolean;
  consent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AnxietyCheckin {
  id?: string;
  user_id?: string;
  session_id?: string | null;
  anxiety_before: number; // 1-5
  anxiety_after?: number | null; // 1-5
  created_at?: string;
}

export interface DiaryEntry {
  id: string;
  user_id?: string;
  session_id?: string | null;
  note: string;
  severity: number | null; // 1-5
  mood?: number | null; // 1-5
  created_at: string;
}
