import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;
    const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours
    const LOGIN_TIME_KEY = 'app_login_time';

    const startLogoutTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
      if (!loginTime) {
        localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
      }
      const elapsed = Date.now() - Number(localStorage.getItem(LOGIN_TIME_KEY));
      const remaining = SESSION_DURATION - elapsed;
      if (remaining <= 0) {
        localStorage.removeItem(LOGIN_TIME_KEY);
        supabase.auth.signOut();
        return;
      }
      logoutTimer = setTimeout(() => {
        localStorage.removeItem(LOGIN_TIME_KEY);
        supabase.auth.signOut();
      }, remaining);
    };

    const clearLogoutTimer = () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
      }
      localStorage.removeItem(LOGIN_TIME_KEY);
    };

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const resetInvalidSession = async () => {
      clearLogoutTimer();
      previousUserIdRef.current = null;
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignora falhas de limpeza local
      }
      applySession(null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        void resetInvalidSession();
        return;
      }

      const previousUserId = previousUserIdRef.current;
      const nextUserId = session?.user?.id ?? null;
      const userChanged = previousUserId !== nextUserId;

      applySession(session);
      previousUserIdRef.current = nextUserId;

      if (event === 'SIGNED_IN') {
        if (userChanged || !localStorage.getItem(LOGIN_TIME_KEY)) {
          localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
        }
        startLogoutTimer();
        // SIGNED_IN também pode acontecer ao recuperar foco da aba.
        // Limpar cache aqui só é seguro quando realmente houve troca de usuário/login.
        if (userChanged) {
          queryClient.clear();
        }
      } else if (event === 'SIGNED_OUT') {
        clearLogoutTimer();
        previousUserIdRef.current = null;
        queryClient.clear();
      } else if (session) {
        startLogoutTimer();
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Erro ao recuperar sessão:', error);
        void resetInvalidSession();
        return;
      }
      previousUserIdRef.current = session?.user?.id ?? null;
      applySession(session);

      if (session) {
        startLogoutTimer();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
