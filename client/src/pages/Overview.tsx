import { useLocation } from "wouter";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Plus, Sparkles, Table2, Users } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { occupancyHours, TODAY } from "@/data/mockData";
import { PageHeader, Panel, PrimaryButton, SectionTitle, ServiceProgress, StatCard, StatusBadge } from "@/components/shared/Primitives";

export default function Overview() {
  const [, navigate] = useLocation();
  const { restaurant, reservations, activeReservations, lunchCovers, dinnerCovers, totalCovers, staffOnDuty, staffOnDutyByArea, setModalOpen } = useAppData();
  const todayReservations = reservations.filter((item) => item.date === TODAY);
  const pending = activeReservations.filter((item) => item.status === "pending").length;
  const upcoming = activeReservations.filter((item) => item.service === "Cena").slice(0, 5);
  const lunchCapacity = restaurant?.lunchCapacity ?? 80;
  const dinnerCapacity = restaurant?.dinnerCapacity ?? 80;
  const totalCapacity = lunchCapacity + dinnerCapacity;

  return (
    <div className="page overview-page">
      <PageHeader
        eyebrow="Martedì 16 settembre 2026"
        title="Buongiorno, Ludovico"
        description="Ecco la situazione di oggi, martedì 16 settembre 2026."
        action={<PrimaryButton onClick={() => setModalOpen(true)}><Plus size={18} />Nuova prenotazione</PrimaryButton>}
      />

      <div className="weather-mobile panel"><span>☀</span><b>23°</b><small>Brescia · Cielo sereno</small></div>
      <div className="stats-grid four">
        <StatCard icon={CalendarDays} value={todayReservations.length} label="Prenotazioni oggi" foot={`+${pending} in attesa`} tone="green" />
        <StatCard icon={Users} value={totalCovers} label="Coperti prenotati" foot={`${Math.round((totalCovers / totalCapacity) * 100)}% della capienza giornaliera`} tone="neutral" />
        <StatCard icon={Table2} value={Math.max(0, totalCapacity - totalCovers)} label="Posti disponibili" foot={`su ${totalCapacity} coperti`} tone="neutral" />
        <StatCard icon={Clock3} value={staffOnDuty.length} label="Persone in turno" foot={`${staffOnDutyByArea.Sala} sala · ${staffOnDutyByArea.Cucina} cucina · ${staffOnDutyByArea.Bar} bar`} tone="neutral" />
      </div>

      <div className="overview-services">
        <Panel className="service-card"><ServiceProgress label={`PRANZO · ${restaurant?.lunchOpen ?? "12:00"} – ${restaurant?.lunchClose ?? "15:00"}`} used={lunchCovers} total={lunchCapacity} /></Panel>
        <Panel className="service-card"><ServiceProgress label={`CENA · ${restaurant?.dinnerOpen ?? "19:00"} – ${restaurant?.dinnerClose ?? "23:00"}`} used={dinnerCovers} total={dinnerCapacity} /></Panel>
        <Panel className="atmosphere-card"><div className="atmosphere-glow" /><Sparkles size={20} /><p>“La buona cucina<br />è un atto d’amore.”</p><small>BLACKDOT</small></Panel>
      </div>

      <div className="overview-bottom">
        <Panel className="flow-panel">
          <SectionTitle action={<button onClick={() => navigate("/affluenza")}>Vedi dettagli</button>}>Affluenza di oggi</SectionTitle>
          <div className="mini-flow-chart">
            {occupancyHours.slice(0, 9).map((item) => <div key={item.time} className="flow-row"><span>{item.time}</span><i style={{ width: `${Math.max(12, item.value * 2.15)}%` }} className={item.value >= 30 ? "red" : item.value >= 20 ? "gold" : "green"} /><b>{item.value}</b></div>)}
          </div>
        </Panel>

        <Panel className="upcoming-panel">
          <SectionTitle action={<button onClick={() => navigate("/prenotazioni")}>Tutte</button>}>Prossime prenotazioni</SectionTitle>
          <div className="upcoming-list">
            {upcoming.map((item) => <button key={item.id} onClick={() => navigate("/prenotazioni")}><span>{item.time}</span><b>{item.name.split(" ").pop()}</b><small>{item.guests}</small><StatusBadge status={item.status} /></button>)}
          </div>
        </Panel>

        <Panel className="manage-panel">
          <SectionTitle>Da gestire</SectionTitle>
          <button onClick={() => navigate("/prenotazioni")}><span className="manage-icon gold"><AlertCircle /></span><span><b>{pending} richieste di prenotazione</b><small>in attesa di conferma</small></span></button>
          <button onClick={() => navigate("/personale")}><span className="manage-icon green"><Users /></span><span><b>{staffOnDuty.length} persone in servizio</b><small>copertura del turno odierno</small></span></button>
          <button><span className="manage-icon"><CheckCircle2 /></span><span><b>Nessuna anomalia segnalata</b><small>tutto procede regolarmente</small></span></button>
        </Panel>
      </div>
    </div>
  );
}
