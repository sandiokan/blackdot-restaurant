import { useEffect, useState } from "react";
import { Bell, Building2, CalendarDays, Globe2, Link2, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, PrimaryButton, Segmented } from "@/components/shared/Primitives";
import AccessManagementPanel from "@/components/AccessManagementPanel";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import type { RestaurantUpdate } from "@/types/models";

const sections = ["Ristorante", "Servizi", "Prenotazioni", "Notifiche", "Utenti", "Integrazioni"];
const emptyRestaurant: RestaurantUpdate = {
  name: "",
  address: "",
  phone: "",
  email: "info@blackdotstudio.it",
  lunchOpen: "12:00",
  lunchClose: "15:00",
  lunchCapacity: 80,
  dinnerOpen: "19:00",
  dinnerClose: "23:00",
  dinnerCapacity: 80,
};

export default function SettingsPage() {
  const { restaurant, loading, saving, saveRestaurant } = useAppData();
  const { canManageOperations, role } = useAuth();
  const [section, setSection] = useState("Ristorante");
  const [lunch, setLunch] = useState(true);
  const [dinner, setDinner] = useState(true);
  const [language, setLanguage] = useState("Italiano");
  const [form, setForm] = useState<RestaurantUpdate>(emptyRestaurant);
  const iconMap = { Ristorante: Building2, Servizi: CalendarDays, Prenotazioni: Users, Notifiche: Bell, Utenti: Users, Integrazioni: Link2 };
  const visibleSections = role === "OWNER" ? sections : sections.filter((item) => item !== "Utenti");
  const currentSection = section === "Utenti" && role !== "OWNER" ? "Ristorante" : section;

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      lunchOpen: restaurant.lunchOpen,
      lunchClose: restaurant.lunchClose,
      lunchCapacity: restaurant.lunchCapacity,
      dinnerOpen: restaurant.dinnerOpen,
      dinnerClose: restaurant.dinnerClose,
      dinnerCapacity: restaurant.dinnerCapacity,
    });
  }, [restaurant]);

  function updateField<K extends keyof RestaurantUpdate>(field: K, value: RestaurantUpdate[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (!canManageOperations) return;
    if (!form.name.trim()) {
      toast.error("Inserisci il nome del ristorante");
      return;
    }
    try {
      await saveRestaurant({ ...form, name: form.name.trim(), email: form.email.trim() || "info@blackdotstudio.it" });
      toast.success("Impostazioni salvate");
    } catch (error) {
      toast.error("Salvataggio non riuscito", { description: error instanceof Error ? error.message : undefined });
    }
  }

  return <div className="page settings-page">
    <PageHeader title="Impostazioni" description="Configura il tuo ristorante e le preferenze del gestionale." />
    <div className="settings-tabs">{visibleSections.map((item) => { const Icon = iconMap[item as keyof typeof iconMap]; return <button key={item} className={currentSection === item ? "active" : ""} onClick={() => setSection(item)}><Icon size={17} />{item}</button>})}</div>
    {currentSection === "Ristorante" ? <div className="settings-grid">
      <Panel className="restaurant-info"><h2>Informazioni ristorante</h2><div className="restaurant-brand-card"><div className="restaurant-image">{form.name.split(" ").map((word) => word[0]).slice(0, 2).join("") || "BD"}</div><button onClick={() => toast.success("Selezione immagine aperta")} disabled={!canManageOperations}>Cambia immagine</button></div><label className="field"><span>Nome ristorante</span><input value={form.name} onChange={(event) => updateField("name", event.target.value)} disabled={loading || !canManageOperations} /></label><label className="field"><span>Indirizzo</span><input value={form.address} onChange={(event) => updateField("address", event.target.value)} disabled={loading || !canManageOperations} /></label><label className="field"><span>Telefono</span><input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} disabled={loading || !canManageOperations} /></label><label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} disabled={loading || !canManageOperations} /></label></Panel>
      <Panel><h2>Orari di servizio</h2><ServiceSetting label="Pranzo" active={lunch} onChange={setLunch} start={form.lunchOpen} end={form.lunchClose} capacity={form.lunchCapacity} disabled={!canManageOperations} onStartChange={(value) => updateField("lunchOpen", value)} onEndChange={(value) => updateField("lunchClose", value)} onCapacityChange={(value) => updateField("lunchCapacity", value)} /><ServiceSetting label="Cena" active={dinner} onChange={setDinner} start={form.dinnerOpen} end={form.dinnerClose} capacity={form.dinnerCapacity} disabled={!canManageOperations} onStartChange={(value) => updateField("dinnerOpen", value)} onEndChange={(value) => updateField("dinnerClose", value)} onCapacityChange={(value) => updateField("dinnerCapacity", value)} /></Panel>
      <Panel><h2>Altre impostazioni</h2><label className="field"><span>Fuso orario</span><select disabled={!canManageOperations}><option>Europe/Rome</option></select></label><label className="field"><span>Lingua</span><select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={!canManageOperations}><option>Italiano</option><option>English</option></select></label><label className="field"><span>Valuta</span><select disabled={!canManageOperations}><option>Euro (€)</option></select></label></Panel>
      <PrimaryButton className="settings-save" onClick={() => void handleSave()} disabled={loading || saving || !canManageOperations}><Save size={17} />{saving ? "Salvataggio..." : "Salva modifiche"}</PrimaryButton>
    </div> : currentSection === "Utenti" && role === "OWNER" ? <AccessManagementPanel /> : <Panel className="settings-placeholder"><Globe2 size={28} /><h2>{currentSection}</h2><p>I controlli essenziali di questa sezione sono disponibili nel prototipo V1.</p>{canManageOperations && <Segmented options={["Attivo", "Disattivo"]} value="Attivo" onChange={() => toast.success(`${currentSection}: preferenza aggiornata`)} />}</Panel>}
  </div>;
}

function ServiceSetting({ label, active, onChange, start, end, capacity, disabled, onStartChange, onEndChange, onCapacityChange }: { label: string; active: boolean; onChange: (value: boolean) => void; start: string; end: string; capacity: number; disabled: boolean; onStartChange: (value: string) => void; onEndChange: (value: string) => void; onCapacityChange: (value: number) => void }) {
  return <div className="service-setting"><div><b>{label}</b><button className={`switch ${active ? "active" : ""}`} onClick={() => onChange(!active)} aria-label={`Attiva ${label}`} disabled={disabled}><span /></button></div><div><input type="time" value={start} onChange={(event) => onStartChange(event.target.value)} disabled={disabled} /><span>—</span><input type="time" value={end} onChange={(event) => onEndChange(event.target.value)} disabled={disabled} /></div><label>Capienza <input type="number" min={1} value={capacity} onChange={(event) => onCapacityChange(Math.max(1, Number(event.target.value)))} disabled={disabled} /></label></div>;
}
