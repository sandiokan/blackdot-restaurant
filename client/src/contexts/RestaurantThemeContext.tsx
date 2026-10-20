import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { RestaurantBranding, RestaurantBrandingDraft, RestaurantThemeMode } from "@/types/models";

const BRAND_ASSET_BUCKET = "restaurant-brand-assets";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

const DEFAULT_BRANDING: RestaurantBranding = {
  restaurantId: null,
  displayName: null,
  logoPath: null,
  logoUrl: null,
  themeMode: "DARK",
  primaryColor: "#EEB36D",
  secondaryColor: "#F5CD96",
};

const THEME_PROPERTIES = ["--brand-primary", "--brand-secondary", "--brand-primary-rgb", "--brand-action-start", "--brand-action-end"] as const;

type DatabaseBranding = {
  restaurant_id: string;
  display_name: string | null;
  logo_path: string | null;
  theme_mode: RestaurantThemeMode;
  primary_color: string;
  secondary_color: string | null;
};

type RestaurantThemeContextValue = {
  branding: RestaurantBranding;
  savedBranding: RestaurantBranding;
  loading: boolean;
  canManageBranding: boolean;
  previewBranding: (draft: RestaurantBrandingDraft) => void;
  restoreBranding: () => void;
  saveBranding: (draft: RestaurantBrandingDraft, logoFile: File | null) => Promise<void>;
  resetBranding: () => Promise<void>;
};

const RestaurantThemeContext = createContext<RestaurantThemeContextValue | undefined>(undefined);

function normalizeHex(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

function hexToRgbValue(hex: string) {
  const parsed = Number.parseInt(hex.slice(1), 16);
  return `${(parsed >> 16) & 255} ${(parsed >> 8) & 255} ${parsed & 255}`;
}

function clearTheme() {
  const root = document.documentElement;
  THEME_PROPERTIES.forEach((property) => root.style.removeProperty(property));
  root.classList.remove("restaurant-theme-light");
}

function applyTheme(branding: RestaurantBranding) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", branding.primaryColor);
  root.style.setProperty("--brand-secondary", branding.secondaryColor);
  root.style.setProperty("--brand-primary-rgb", hexToRgbValue(branding.primaryColor));
  root.style.setProperty("--brand-action-start", `color-mix(in srgb, ${branding.primaryColor} 82%, white)`);
  root.style.setProperty("--brand-action-end", branding.primaryColor);
  root.classList.toggle("restaurant-theme-light", branding.themeMode === "LIGHT");
}

async function getLogoUrl(path: string | null) {
  if (!path || !supabase) return null;
  const { data, error } = await supabase.storage.from(BRAND_ASSET_BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}

function mapBranding(row: DatabaseBranding | null, logoUrl: string | null): RestaurantBranding {
  if (!row) return DEFAULT_BRANDING;
  return {
    restaurantId: row.restaurant_id,
    displayName: row.display_name?.trim() || null,
    logoPath: row.logo_path,
    logoUrl,
    themeMode: row.theme_mode === "LIGHT" ? "LIGHT" : "DARK",
    primaryColor: normalizeHex(row.primary_color, DEFAULT_BRANDING.primaryColor),
    secondaryColor: normalizeHex(row.secondary_color, DEFAULT_BRANDING.secondaryColor),
  };
}

function fromDraft(draft: RestaurantBrandingDraft, restaurantId: string): RestaurantBranding {
  return {
    restaurantId,
    displayName: draft.displayName.trim() || null,
    logoPath: draft.logoPath,
    logoUrl: draft.logoUrl,
    themeMode: draft.themeMode,
    primaryColor: normalizeHex(draft.primaryColor, DEFAULT_BRANDING.primaryColor),
    secondaryColor: normalizeHex(draft.secondaryColor, DEFAULT_BRANDING.secondaryColor),
  };
}

function assertLogoFile(file: File) {
  if (!LOGO_MIME_TYPES.includes(file.type)) throw new Error("Il logo deve essere in formato PNG, JPEG o WebP.");
  if (file.size > MAX_LOGO_BYTES) throw new Error("Il logo supera la dimensione massima di 2 MB.");
}

function logoPathFor(restaurantId: string, mimeType: string) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${restaurantId}/logo.${extension}`;
}

export function RestaurantThemeProvider({ children, targetRestaurantId, canManageBranding: canManageBrandingOverride }: { children: ReactNode; targetRestaurantId?: string | null; canManageBranding?: boolean }) {
  const { restaurantId: authenticatedRestaurantId, role, user } = useAuth();
  const restaurantId = targetRestaurantId ?? authenticatedRestaurantId;
  const canManageBranding = canManageBrandingOverride ?? role === "OWNER";
  const [branding, setBranding] = useState<RestaurantBranding>(DEFAULT_BRANDING);
  const [savedBranding, setSavedBranding] = useState<RestaurantBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);

  const restoreBranding = useCallback(() => setBranding(savedBranding), [savedBranding]);

  const previewBranding = useCallback((draft: RestaurantBrandingDraft) => {
    if (!restaurantId) return;
    setBranding(fromDraft(draft, restaurantId));
  }, [restaurantId]);

  const saveBranding = useCallback(async (draft: RestaurantBrandingDraft, logoFile: File | null) => {
    if (!supabase || !restaurantId || !canManageBranding) throw new Error("Non sei autorizzato a modificare l’identità grafica.");

    let nextLogoPath = draft.logoPath;
    let uploadedPath: string | null = null;
    if (logoFile) {
      assertLogoFile(logoFile);
      uploadedPath = logoPathFor(restaurantId, logoFile.type);
      const { error: uploadError } = await supabase.storage.from(BRAND_ASSET_BUCKET).upload(uploadedPath, logoFile, { upsert: true, contentType: logoFile.type });
      if (uploadError) throw uploadError;
      nextLogoPath = uploadedPath;
    }

    const { data, error } = await supabase
      .from("restaurant_branding")
      .upsert({
        restaurant_id: restaurantId,
        display_name: draft.displayName.trim() || null,
        logo_path: nextLogoPath,
        theme_mode: draft.themeMode,
        primary_color: normalizeHex(draft.primaryColor, DEFAULT_BRANDING.primaryColor),
        secondary_color: normalizeHex(draft.secondaryColor, DEFAULT_BRANDING.secondaryColor),
        updated_at: new Date().toISOString(),
      }, { onConflict: "restaurant_id" })
      .select("restaurant_id, display_name, logo_path, theme_mode, primary_color, secondary_color")
      .single();

    if (error) {
      if (uploadedPath && uploadedPath !== savedBranding.logoPath) await supabase.storage.from(BRAND_ASSET_BUCKET).remove([uploadedPath]);
      throw error;
    }

    if (savedBranding.logoPath && savedBranding.logoPath !== nextLogoPath) {
      await supabase.storage.from(BRAND_ASSET_BUCKET).remove([savedBranding.logoPath]);
    }

    const logoUrl = await getLogoUrl(nextLogoPath);
    const nextBranding = mapBranding(data as DatabaseBranding, logoUrl);
    setSavedBranding(nextBranding);
    setBranding(nextBranding);
  }, [restaurantId, canManageBranding, savedBranding.logoPath]);

  const resetBranding = useCallback(async () => {
    if (!supabase || !restaurantId || !canManageBranding) throw new Error("Non sei autorizzato a modificare l’identità grafica.");
    const previousLogoPath = savedBranding.logoPath;
    const { error } = await supabase.from("restaurant_branding").delete().eq("restaurant_id", restaurantId);
    if (error) throw error;
    if (previousLogoPath) await supabase.storage.from(BRAND_ASSET_BUCKET).remove([previousLogoPath]);
    setSavedBranding(DEFAULT_BRANDING);
    setBranding(DEFAULT_BRANDING);
  }, [restaurantId, canManageBranding, savedBranding.logoPath]);

  useEffect(() => {
    let active = true;
    clearTheme();
    setBranding(DEFAULT_BRANDING);
    setSavedBranding(DEFAULT_BRANDING);

    if (!restaurantId || !user || !supabase || !isSupabaseConfigured) {
      setLoading(false);
      return () => {
        active = false;
        clearTheme();
      };
    }

    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("restaurant_branding")
        .select("restaurant_id, display_name, logo_path, theme_mode, primary_color, secondary_color")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setLoading(false);
        return;
      }

      const row = data as DatabaseBranding | null;
      const nextBranding = mapBranding(row, await getLogoUrl(row?.logo_path ?? null));
      if (!active) return;
      setSavedBranding(nextBranding);
      setBranding(nextBranding);
      setLoading(false);
    })();

    return () => {
      active = false;
      clearTheme();
    };
  }, [restaurantId, user?.id]);

  useEffect(() => {
    applyTheme(branding);
  }, [branding]);

  const value = useMemo(() => ({ branding, savedBranding, loading, canManageBranding, previewBranding, restoreBranding, saveBranding, resetBranding }), [branding, savedBranding, loading, canManageBranding, previewBranding, restoreBranding, saveBranding, resetBranding]);
  return <RestaurantThemeContext.Provider value={value}>{children}</RestaurantThemeContext.Provider>;
}

export function useRestaurantTheme() {
  const value = useContext(RestaurantThemeContext);
  if (!value) throw new Error("useRestaurantTheme must be used inside RestaurantThemeProvider");
  return value;
}
