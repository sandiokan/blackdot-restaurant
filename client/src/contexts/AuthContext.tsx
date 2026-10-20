import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
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

type RecoveryCallback = {
  active: boolean;
  error: string | null;
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
  passwordRecoveryActive: boolean;
  passwordRecoveryError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  completePasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeAccessError() {
  return "Il tuo account non è associato a un ristorante autorizzato.";
}

function getRecoveryCallback(): RecoveryCallback {
  if (typeof window === "undefined") return { active: false, error: null };
  const search = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const getParam = (name: string) => search.get(name) ?? fragment.get(name);
  const errorCode = getParam("error_code");
  const isInvitation = search.has("invitation");

  if (!isInvitation && errorCode === "otp_expired") {
    return { active: false, error: "Il link per reimpostare la password è scaduto o non è più valido. Richiedine uno nuovo." };
  }
  return { active: false, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialRecovery = getRecoveryCallback();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<RestaurantAccess | null>(null);
  const [studioAccess, setStudioAccess] = useState<StudioAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(initialRecovery.active);
  const [passwordRecoveryError, setPasswordRecoveryError] = useState<string | null>(initialRecovery.error);

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

    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryActive(true);
        setPasswordRecoveryError(null);
      }
      if (event === "SIGNED_OUT") {
        setPasswordRecoveryActive(false);
        setPasswordRecoveryError(null);
      }
      void resolveSession(nextSession);
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
    setPasswordRecoveryActive(false);
    setPasswordRecoveryError(null);
    await resolveSession(data.session);
  }, [resolveSession]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setPasswordRecoveryActive(false);
    setPasswordRecoveryError(null);
    await resolveSession(null);
  }, [resolveSession]);

  const refreshAccess = useCallback(async () => {
    await resolveSession(session);
  }, [resolveSession, session]);

  const completePasswordRecovery = useCallback(() => {
    setPasswordRecoveryActive(false);
    setPasswordRecoveryError(null);
  }, []);

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
    passwordRecoveryActive,
    passwordRecoveryError,
    signIn,
    signOut,
    refreshAccess,
    completePasswordRecovery,
  }), [loading, session, access, studioAccess, accessError, passwordRecoveryActive, passwordRecoveryError, signIn, signOut, refreshAccess, completePasswordRecovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
