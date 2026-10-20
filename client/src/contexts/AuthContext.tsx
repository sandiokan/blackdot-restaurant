import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type RestaurantUserRole = "OWNER" | "MANAGER" | "EMPLOYEE";
export type StudioUserRole = "STUDIO_ADMIN";

type RestaurantAccess = {
  restaurantId: string;
  role: RestaurantUserRole;
};

type StudioAccess = {
  role: StudioUserRole;
};

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  restaurantId: string | null;
  role: RestaurantUserRole | null;
  studioRole: StudioUserRole | null;
  isStudioAdmin: boolean;
  canManageOperations: boolean;
  accessError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeAccessError() {
  return "Il tuo account non è associato a un ristorante autorizzato.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<RestaurantAccess | null>(null);
  const [studioAccess, setStudioAccess] = useState<StudioAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setAccess(null);
    setStudioAccess(null);
    setAccessError(null);

    if (!nextSession?.user || !supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [restaurantResult, studioResult] = await Promise.all([
      supabase
        .from("restaurant_users")
        .select("restaurant_id, role")
        .eq("user_id", nextSession.user.id)
        .maybeSingle(),
      supabase
        .from("blackdot_studio_users")
        .select("role")
        .eq("user_id", nextSession.user.id)
        .eq("active", true)
        .maybeSingle(),
    ]);

    if (restaurantResult.error) {
      setAccessError("Impossibile verificare l'accesso al ristorante.");
    } else if (restaurantResult.data) {
      setAccess({ restaurantId: restaurantResult.data.restaurant_id, role: restaurantResult.data.role as RestaurantUserRole });
    }

    if (!studioResult.error && studioResult.data?.role === "STUDIO_ADMIN") {
      setStudioAccess({ role: "STUDIO_ADMIN" });
    }

    if (!restaurantResult.error && !restaurantResult.data && (studioResult.error || !studioResult.data)) {
      setAccessError(normalizeAccessError());
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

  const refreshAccess = useCallback(async () => {
    await resolveSession(session);
  }, [resolveSession, session]);

  const value = useMemo(() => ({
    loading,
    user: session?.user ?? null,
    session,
    restaurantId: access?.restaurantId ?? null,
    role: access?.role ?? null,
    studioRole: studioAccess?.role ?? null,
    isStudioAdmin: studioAccess?.role === "STUDIO_ADMIN",
    canManageOperations: access?.role === "OWNER" || access?.role === "MANAGER",
    accessError,
    signIn,
    signOut,
    refreshAccess,
  }), [loading, session, access, studioAccess, accessError, signIn, signOut, refreshAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
