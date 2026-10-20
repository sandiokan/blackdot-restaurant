import { createClient } from "@supabase/supabase-js";

const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = configuredUrl?.replace(/\/rest\/v1\/?$/, "");
let passwordRecoveryPending = false;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function hasPendingPasswordRecovery() {
  return passwordRecoveryPending;
}

export function clearPendingPasswordRecovery() {
  passwordRecoveryPending = false;
}

// This singleton listener is intentionally registered immediately after client creation.
// Supabase may consume a recovery callback and emit PASSWORD_RECOVERY before React effects mount.
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") passwordRecoveryPending = true;
    if (event === "SIGNED_OUT") clearPendingPasswordRecovery();
  });
}
