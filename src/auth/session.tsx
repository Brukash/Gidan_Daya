import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Cadre, MemberRole } from '../data/types';
import { supabase } from '../lib/supabase';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  memberNumber: string;
  cadre: Cadre;
}

interface SessionValue {
  user: SessionUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);
const DEMO_KEY = 'gidan-daya:user';

const DEMO_PASSWORD = 'gidandaya';

export const DEMO_MEMBER = {
  email: 'member@coop.example',
  password: DEMO_PASSWORD,
} as const;

export const DEMO_ADMIN = {
  email: 'admin@coop.example',
  password: DEMO_PASSWORD,
} as const;

/** The sample member behind both demo accounts. */
const DEMO_PROFILE = {
  id: 'm-001',
  name: 'Aisha Bello',
  memberNumber: 'CBN/2019/0417',
  cadre: 'Assistant Manager' as Cadre,
} as const;

function readDemoSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DEMO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => (supabase ? null : readDemoSession()));
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let active = true;

    const load = async (id: string, email: string) => {
      const { data: profile } = await client
        .from('profiles')
        .select('full_name, role, member_number, cadre')
        .eq('id', id)
        .maybeSingle<{ full_name: string; role: MemberRole; member_number: string; cadre: Cadre }>();
      if (!active) return;
      setUser({
        id,
        email,
        name: profile?.full_name ?? email,
        role: profile?.role ?? 'member',
        memberNumber: profile?.member_number ?? '',
        cadre: profile?.cadre ?? 'Clerk',
      });
      setLoading(false);
    };

    void client.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session) {
        if (active) setLoading(false);
        return;
      }
      void load(session.user.id, session.user.email ?? '');
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      void load(session.user.id, session.user.email ?? '');
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return;
    }

    const normalised = email.trim().toLowerCase();
    const isSecretariat = normalised.startsWith('admin');
    const next: SessionUser = {
      ...DEMO_PROFILE,
      email: normalised,
      role: isSecretariat ? 'admin' : 'member',
      name: isSecretariat ? 'Aisha Bello (secretariat)' : DEMO_PROFILE.name,
    };
    window.sessionStorage.setItem(DEMO_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
      return;
    }
    window.sessionStorage.removeItem(DEMO_KEY);
    setUser(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
