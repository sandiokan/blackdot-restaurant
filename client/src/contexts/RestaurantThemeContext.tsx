import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { RestaurantBranding, RestaurantThemeMode } from "@/types/models";

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
  loading: boolean;
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
  const { data, error } = await supabase.storage.from("restaurant-brand-assets").createSignedUrl(path, 60 * 60);
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

export function RestaurantThemeProvider({ children }: { children: ReactNode }) {
  const { restaurantId, user } = useAuth();
  const [branding, setBranding] = useState<RestaurantBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    clearTheme();
    setBranding(DEFAULT_BRANDING);

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
      const logoUrl = await getLogoUrl(row?.logo_path ?? null);
      if (!active) return;
      setBranding(mapBranding(row, logoUrl));
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

  const value = useMemo(() => ({ branding, loading }), [branding, loading]);
  return <RestaurantThemeContext.Provider value={value}>{children}</RestaurantThemeContext.Provider>;
}

export function useRestaurantTheme() {
  const value = useContext(RestaurantThemeContext);
  if (!value) throw new Error("useRestaurantTheme must be used inside RestaurantThemeProvider");
  return value;
}
