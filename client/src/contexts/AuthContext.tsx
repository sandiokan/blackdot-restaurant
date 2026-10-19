import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type RestaurantUserRole = "OWNER" | "MANAGER" | "EMPLOYEE";

type RestaurantAccess = {
  restaurantId: string;
  role: RestaurantUserRole;
};

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  restaurantId: string | null;
  role: RestaurantUserRole | null;
  canManageOperations: boolean;
  accessError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeAccessError() {
  return "Il tuo account non è associato a un ristorante autorizzato.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<RestaurantAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setAccess(null);
    setAccessError(null);

    if (!nextSession?.user || !supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("restaurant_users")
      .select("restaurant_id, role")
      .eq("user_id", nextSession.user.id)
      .maybeSingle();

    if (error) {
      setAccessError("Impossibile verificare l'accesso al ristorante.");
    } else if (!data) {
      setAccessError(normalizeAccessError());
    } else {
      setAccess({ restaurantId: data.restaurant_id, role: data.role as RestaurantUserRole });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setAccessError("Configurazione Supabase non disponibile.");
      setLoading(false);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) void resolveSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) void resolveSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [resolveSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase || !isSupabaseConfigured) throw new Error("Configurazione Supabase non disponibile.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await resolveSession(data.session);
  }, [resolveSession]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    await resolveSession(null);
  }, [resolveSession]);

  const value = useMemo(() => ({
    loading,
    user: session?.user ?? null,
    session,
    restaurantId: access?.restaurantId ?? null,
    role: access?.role ?? null,
    canManageOperations: access?.role === "OWNER" || access?.role === "MANAGER",
    accessError,
    signIn,
    signOut,
  }), [loading, session, access, accessError, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
