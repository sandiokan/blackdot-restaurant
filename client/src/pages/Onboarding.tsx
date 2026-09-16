import { useState } from "react";
import { Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Globe2, Link2, MapPin, UtensilsCrossed } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { GhostButton, Panel, PrimaryButton } from "@/components/shared/Primitives";

const steps = [
  { title: "Dati ristorante", icon: Building2 }, { title: "Indirizzo", icon: MapPin }, { title: "Capienza e servizi", icon: UtensilsCrossed }, { title: "Orari di servizio", icon: Clock3 }, { title: "Menù (opzionale)", icon: CalendarDays }, { title: "Tema (opzionale)", icon: Globe2 }, { title: "Integrazioni", icon: Link2 }, { title: "Conferma", icon: Check },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(2);
  const [lunch, setLunch] = useState(true);
  const [dinner, setDinner] = useState(true);

  function next() {
    if (step === steps.length - 1) { toast.success("Configurazione completata"); navigate("/"); }
    else setStep((value) => value + 1);
  }

  return <div className="onboarding-shell">
    <aside className="onboarding-sidebar"><div className="brand"><span>BLACKDOT</span><small>RESTAURANT</small></div><div className="onboarding-steps">{steps.map((item, index) => { const Icon = item.icon; return <button key={item.title} onClick={() => setStep(index)} className={index === step ? "active" : index < step ? "done" : ""}><span>{index < step ? <Check size={14} /> : index + 1}</span><Icon size={17} /><b>{item.title}</b></button>})}</div><button className="exit-onboarding" onClick={() => navigate("/")}><ChevronLeft size={17} />Esci dalla configurazione</button></aside>
    <main className="onboarding-main"><div className="onboarding-top"><span>Configurazione ristorante</span><div className="progress-line"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><b>{step + 1}/{steps.length}</b></div>
      <div className="onboarding-content"><p className="eyebrow">PASSAGGIO {step + 1}</p><h1>{steps[step].title}</h1><p>{step === 2 ? "Imposta la capienza e i servizi del tuo ristorante." : "Completa le informazioni richieste per configurare il ristorante."}</p>
        {step === 2 ? <Panel className="capacity-form"><label className="field"><span>Coperti massimi</span><input type="number" defaultValue={100} /></label><div className="onboarding-services"><OnboardingService label="Pranzo" active={lunch} onChange={setLunch} start="12:00" end="15:00" /><OnboardingService label="Cena" active={dinner} onChange={setDinner} start="19:00" end="23:00" /></div><div className="amenities"><h3>Servizi disponibili</h3>{["Sala interna", "Sala privata", "Dehor esterno", "Accesso disabili", "Parcheggio privato"].map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 2} />{item}</label>)}</div></Panel> : <Panel className="step-generic"><div className="step-icon">{(() => { const Icon = steps[step].icon; return <Icon />; })()}</div><label className="field"><span>{steps[step].title}</span><input placeholder={`Inserisci ${steps[step].title.toLowerCase()}`} /></label><p>Le informazioni vengono salvate localmente durante il prototipo.</p></Panel>}
        <div className="onboarding-actions"><GhostButton onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={17} />Indietro</GhostButton><PrimaryButton onClick={next}>{step === steps.length - 1 ? "Completa" : "Continua"}<ChevronRight size={17} /></PrimaryButton></div>
      </div>
    </main>
  </div>;
}

function OnboardingService({ label, active, onChange, start, end }: { label: string; active: boolean; onChange: (value: boolean) => void; start: string; end: string }) {
  return <div className="onboarding-service"><div><b>{label}</b><button className={`switch ${active ? "active" : ""}`} onClick={() => onChange(!active)}><span /></button></div><div><label><span>Orario</span><input defaultValue={start} /> <input defaultValue={end} /></label><label><span>Capienza</span><input type="number" defaultValue={50} /></label></div></div>;
}
