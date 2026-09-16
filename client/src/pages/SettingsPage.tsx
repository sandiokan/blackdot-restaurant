import { useState } from "react";
import { Bell, Building2, CalendarDays, Globe2, Link2, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, PrimaryButton, Segmented } from "@/components/shared/Primitives";

const sections = ["Ristorante", "Servizi", "Prenotazioni", "Notifiche", "Utenti", "Integrazioni"];

export default function SettingsPage() {
  const [section, setSection] = useState("Ristorante");
  const [lunch, setLunch] = useState(true);
  const [dinner, setDinner] = useState(true);
  const [language, setLanguage] = useState("Italiano");
  const iconMap = { Ristorante: Building2, Servizi: CalendarDays, Prenotazioni: Users, Notifiche: Bell, Utenti: Users, Integrazioni: Link2 };

  return <div className="page settings-page">
    <PageHeader title="Impostazioni" description="Configura il tuo ristorante e le preferenze del gestionale." />
    <div className="settings-tabs">{sections.map((item) => { const Icon = iconMap[item as keyof typeof iconMap]; return <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}><Icon size={17} />{item}</button>})}</div>
    {section === "Ristorante" ? <div className="settings-grid">
      <Panel className="restaurant-info"><h2>Informazioni ristorante</h2><div className="restaurant-brand-card"><div className="restaurant-image">OS</div><button onClick={() => toast.success("Selezione immagine aperta")}>Cambia immagine</button></div><label className="field"><span>Nome ristorante</span><input defaultValue="Osteria delle Streghe" /></label><label className="field"><span>Indirizzo</span><input defaultValue="Via delle Rose 12, Brescia" /></label><label className="field"><span>Telefono</span><input defaultValue="+39 030 1234567" /></label><label className="field"><span>Email</span><input defaultValue="info@blackdotstudio.it" /></label></Panel>
      <Panel><h2>Orari di servizio</h2><ServiceSetting label="Pranzo" active={lunch} onChange={setLunch} start="12:00" end="15:00" /><ServiceSetting label="Cena" active={dinner} onChange={setDinner} start="19:00" end="23:00" /></Panel>
      <Panel><h2>Altre impostazioni</h2><label className="field"><span>Fuso orario</span><select><option>Europe/Rome</option></select></label><label className="field"><span>Lingua</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>Italiano</option><option>English</option></select></label><label className="field"><span>Valuta</span><select><option>Euro (€)</option></select></label></Panel>
      <PrimaryButton className="settings-save" onClick={() => toast.success("Impostazioni salvate")}><Save size={17} />Salva modifiche</PrimaryButton>
    </div> : <Panel className="settings-placeholder"><Globe2 size={28} /><h2>{section}</h2><p>I controlli essenziali di questa sezione sono disponibili nel prototipo V1.</p><Segmented options={["Attivo", "Disattivo"]} value="Attivo" onChange={() => toast.success(`${section}: preferenza aggiornata`)} /></Panel>}
  </div>;
}

function ServiceSetting({ label, active, onChange, start, end }: { label: string; active: boolean; onChange: (value: boolean) => void; start: string; end: string }) {
  return <div className="service-setting"><div><b>{label}</b><button className={`switch ${active ? "active" : ""}`} onClick={() => onChange(!active)} aria-label={`Attiva ${label}`}><span /></button></div><div><input defaultValue={start} /><span>—</span><input defaultValue={end} /></div><label>Capienza <input type="number" defaultValue={80} /></label></div>;
}
