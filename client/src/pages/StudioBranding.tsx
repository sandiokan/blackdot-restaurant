import { useCallback, useEffect, useState } from "react";
import { Building2, LogOut, Palette, RefreshCw, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import BrandingSettingsPanel from "@/components/BrandingSettingsPanel";
import { GhostButton, PageHeader, Panel } from "@/components/shared/Primitives";
import { useAuth } from "@/contexts/AuthContext";
import { RestaurantThemeProvider } from "@/contexts/RestaurantThemeContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { StudioRestaurantOption } from "@/types/models";

function BrandingWorkspace({ restaurant }: { restaurant: StudioRestaurantOption }) {
  return <RestaurantThemeProvider targetRestaurantId={restaurant.id} canManageBranding>
    <BrandingSettingsPanel restaurantName={restaurant.name} />
  </RestaurantThemeProvider>;
}

export default function StudioBranding() {
  const [, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const [restaurants, setRestaurants] = useState<StudioRestaurantOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRestaurants = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setError("Configurazione Supabase non disponibile.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("restaurants")
      .select("id, name, address")
      .order("name", { ascending: true });

    if (queryError) {
      setError("Impossibile caricare l’elenco dei ristoranti.");
      setLoading(false);
      return;
    }

    const nextRestaurants = (data ?? []) as StudioRestaurantOption[];
    setRestaurants(nextRestaurants);
    setSelectedId((current) => nextRestaurants.some((restaurant) => restaurant.id === current) ? current : (nextRestaurants[0]?.id ?? ""));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedId) ?? null;

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return <main className="studio-shell">
    <header className="studio-topbar">
      <div className="studio-lockup"><span>BLACKDOT</span><small>STUDIO · AMMINISTRAZIONE</small></div>
      <div className="studio-user"><ShieldCheck size={17} /><span>{user?.email ?? ""}</span><button className="logout-button" onClick={() => void handleSignOut()}><LogOut size={16} />Esci</button></div>
    </header>

    <section className="page studio-page">
      <PageHeader eyebrow="Area riservata" title="Identità grafiche" description="Seleziona un ristorante e gestisci la sua configurazione visiva." />
      <Panel className="studio-tenant-panel">
        <div className="studio-tenant-icon"><Building2 size={20} /></div>
        <div><b>Ristorante cliente</b><p>La configurazione viene applicata solo al ristorante selezionato.</p></div>
        <select aria-label="Seleziona ristorante" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={loading || restaurants.length === 0}>
          {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
        </select>
      </Panel>

      {loading && <Panel className="studio-state"><RefreshCw className="spin" size={16} />Caricamento ristoranti...</Panel>}
      {error && <Panel className="studio-state studio-error"><span>{error}</span><GhostButton onClick={() => void loadRestaurants()}>Riprova</GhostButton></Panel>}
      {!loading && !error && !selectedRestaurant && <Panel className="studio-state">Nessun ristorante disponibile.</Panel>}
      {selectedRestaurant && <BrandingWorkspace key={selectedRestaurant.id} restaurant={selectedRestaurant} />}
    </section>
  </main>;
}
