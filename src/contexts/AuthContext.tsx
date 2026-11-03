'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { clearAccountHistories, clearAccountLetters } from '@/lib/triage/localHistory';
import { UserProfile } from '@/types/user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string) => Promise<{ 
    error: Error | null;
    session?: Session | null;
    user?: User | null;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, session: null, user: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.warn('Could not load profile from Supabase:', err);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        // Sesi bisa berakhir tanpa menekan tombol keluar (token kedaluwarsa,
        // logout dari tab lain). Jejak lokal milik akun tetap harus dibersihkan.
        if (event === 'SIGNED_OUT') {
          clearAccountHistories();
          clearAccountLetters();
        }
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Gagal masuk') };
    }
  };

  const signUp = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
      });

      if (error) return { error: new Error(error.message), session: null, user: null };

      // Profil dibuat otomatis oleh trigger `handle_new_user` di database
      // (consent_health_data tetap false sampai pengguna memberi izin).
      return { error: null, session: data.session, user: data.user };
    } catch (err) {
      return { 
        error: err instanceof Error ? err : new Error('Gagal mendaftar'),
        session: null,
        user: null
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Jejak riwayat milik akun di perangkat ini ikut dibersihkan agar tidak
    // terlihat lagi setelah logout (termasuk setelah refresh). Kunci tamu
    // tidak disentuh karena bukan milik akun siapa pun.
    clearAccountHistories();
    clearAccountLetters();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
