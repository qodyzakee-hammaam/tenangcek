/**
 * Tipe skema database TenangCek (docs/database.md §9).
 *
 * TODO(verify): regenerate dengan perintah berikut setelah project Supabase
 * terhubung, lalu ganti isi file ini:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 *
 * File ini ditulis manual agar query tetap terketik sebelum project ter-link.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Enum kanonik di database (docs/database.md §4). */
export type UrgencyLevelDb = 'monitor' | 'scheduled' | 'urgent' | 'emergency';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          age_range: string | null;
          sex: 'female' | 'male' | 'other' | 'prefer_not' | null;
          conditions: string[];
          allergies: string[];
          tone_pref: 'casual' | 'formal';
          detail_pref: 'brief' | 'detailed';
          region: string | null;
          uses_bpjs: boolean;
          budget_pref: 'low' | 'medium' | 'flexible' | null;
          consent_health_data: boolean;
          consent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
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
        };
        Update: {
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
          updated_at?: string;
        };
        Relationships: [];
      };
      symptom_sessions: {
        Row: {
          id: string;
          user_id: string;
          symptoms: Json;
          answers: Json;
          urgency_level: UrgencyLevelDb;
          reasoning: string;
          next_steps: Json;
          rule_floor: UrgencyLevelDb | null;
          red_flag_triggered: boolean;
          result: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symptoms: Json;
          answers?: Json;
          urgency_level: UrgencyLevelDb;
          reasoning: string;
          next_steps?: Json;
          rule_floor?: UrgencyLevelDb | null;
          red_flag_triggered?: boolean;
          result?: Json | null;
          created_at?: string;
        };
        Update: {
          symptoms?: Json;
          answers?: Json;
          urgency_level?: UrgencyLevelDb;
          reasoning?: string;
          next_steps?: Json;
          rule_floor?: UrgencyLevelDb | null;
          red_flag_triggered?: boolean;
          result?: Json | null;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          anxiety_before: number;
          anxiety_after: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          anxiety_before: number;
          anxiety_after?: number | null;
          created_at?: string;
        };
        Update: {
          session_id?: string | null;
          anxiety_before?: number;
          anxiety_after?: number | null;
        };
        Relationships: [];
      };
      diary_entries: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          note: string;
          severity: number | null;
          mood: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          note: string;
          severity?: number | null;
          mood?: number | null;
          created_at?: string;
        };
        Update: {
          session_id?: string | null;
          note?: string;
          severity?: number | null;
          mood?: number | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      urgency_level: UrgencyLevelDb;
    };
    CompositeTypes: Record<string, never>;
  };
}
