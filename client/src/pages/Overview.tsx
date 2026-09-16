import { useLocation } from "wouter";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Plus, Sparkles, Table2, Users } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { formatLocalDate, getLocalTimeKey } from "@/lib/localDate";
import { coversByTime, occupancyTone } from "@/lib/reservationMetrics";
import { EmptyState, PageHeader, Panel, PrimaryButton, SectionTitle, ServiceProgress, StatCard, StatusBadge } from "@/components/shared/Primitives";

export default function Overview() {
  const [, navigate] = useLocation();
  const { currentDate, restaurant, reservations, activeReservations, lunchCovers, dinnerCovers, totalCovers, staffOnDuty, staffOnDutyByArea, setModalOpen } = useAppData();
  const todayReservations = reservations.filter((item) => item.date === currentDate);
  const pending = activeReservations.filter((item) => item.status === "pending").length;
  const currentTime = getLocalTimeKey();
  const upcoming = activeReservations.filter((item) => item.time >= currentTime).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 5);
  const hourlyCovers = coversByTime(activeReservations);
  const maxHourlyCovers = Math.max(1, ...hourlyCovers.map((item) => item.value));
  const lunchCapacity = restaurant?.lunchCapacity ?? 0;
  const dinnerCapacity = restaurant?.dinnerCapacity ?? 0;
  const totalCapacity = lunchCapacity + dinnerCapacity;
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalCovers / totalCapacity) * 100) : 0;
  const fullDate = formatLocalDate(currentDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="page overview-page">
      <PageHeader
        eyebrow={fullDate}
        title="Buongiorno, Ludovico"
        description={`Ecco la situazione di oggi, ${fullDate}.`}
        action={<PrimaryButton onClick={() => setModalOpen(true)}><Plus size={18} />Nuova prenotazione</PrimaryButton>}
      />

      <div className="weather-mobile panel"><span>☀</span><b>23°</b><small>Brescia · Cielo sereno</small></div>
      <div className="stats-grid four">
        <StatCard icon={CalendarDays} value={todayReservations.length} label="Prenotazioni oggi" foot={pending > 0 ? `${pending} in attesa` : "Nessuna richiesta in attesa"} tone={pending > 0 ? "gold" : "green"} />
        <StatCard icon={Users} value={totalCovers} label="Coperti prenotati" foot={`${occupancyPercent}% della capienza giornaliera`} tone="neutral" />
        <StatCard icon={Table2} value={Math.max(0, totalCapacity - totalCovers)} label="Posti disponibili" foot={`su ${totalCapacity} coperti`} tone="neutral" />
        <StatCard icon={Clock3} value={staffOnDuty.length} label="Persone in turno" foot={`${staffOnDutyByArea.Sala} sala · ${staffOnDutyByArea.Cucina} cucina · ${staffOnDutyByArea.Bar} bar`} tone="neutral" />
      </div>

      <div className="overview-services">
        <Panel className="service-card"><ServiceProgress label={`PRANZO · ${restaurant?.lunchOpen ?? "--:--"} – ${restaurant?.lunchClose ?? "--:--"}`} used={lunchCovers} total={lunchCapacity} /></Panel>
        <Panel className="service-card"><ServiceProgress label={`CENA · ${restaurant?.dinnerOpen ?? "--:--"} – ${restaurant?.dinnerClose ?? "--:--"}`} used={dinnerCovers} total={dinnerCapacity} /></Panel>
        <Panel className="atmosphere-card"><div className="atmosphere-glow" /><Sparkles size={20} /><p>“La buona cucina<br />è un atto d’amore.”</p><small>BLACKDOT</small></Panel>
      </div>

      <div className="overview-bottom">
        <Panel className="flow-panel">
          <SectionTitle action={<button onClick={() => navigate("/affluenza")}>Vedi dettagli</button>}>Affluenza di oggi</SectionTitle>
          {hourlyCovers.length > 0 ? <div className="mini-flow-chart">
            {hourlyCovers.map((item) => {
              const capacity = item.key < "17:00" ? lunchCapacity : dinnerCapacity;
              const percent = capacity > 0 ? Math.round((item.value / capacity) * 100) : 0;
              return <div key={item.key} className="flow-row"><span>{item.label}</span><i style={{ width: `${Math.max(12, (item.value / maxHourlyCovers) * 90)}%` }} className={occupancyTone(percent)} /><b>{item.value}</b></div>;
            })}
          </div> : <EmptyState title="Nessuna affluenza prevista" description="Non ci sono prenotazioni attive per oggi." />}
        </Panel>

        <Panel className="upcoming-panel">
          <SectionTitle action={<button onClick={() => navigate("/prenotazioni")}>Tutte</button>}>Prossime prenotazioni</SectionTitle>
          {upcoming.length > 0 ? <div className="upcoming-list">
            {upcoming.map((item) => <button key={item.id} onClick={() => navigate("/prenotazioni")}><span>{item.time}</span><b>{item.name.split(" ").pop()}</b><small>{item.guests}</small><StatusBadge status={item.status} /></button>)}
          </div> : <EmptyState title="Nessuna prenotazione" description="Non ci sono prenotazioni attive per oggi." />}
        </Panel>

        <Panel className="manage-panel">
          <SectionTitle>Da gestire</SectionTitle>
          <button onClick={() => navigate("/prenotazioni")}><span className="manage-icon gold"><AlertCircle /></span><span><b>{pending} richieste di prenotazione</b><small>{pending > 0 ? "in attesa di conferma" : "nessuna richiesta in attesa"}</small></span></button>
          <button onClick={() => navigate("/personale")}><span className="manage-icon green"><Users /></span><span><b>{staffOnDuty.length} persone in servizio</b><small>copertura del turno odierno</small></span></button>
          <button><span className="manage-icon"><CheckCircle2 /></span><span><b>Nessuna anomalia segnalata</b><small>tutto procede regolarmente</small></span></button>
        </Panel>
      </div>
    </div>
  );
}
