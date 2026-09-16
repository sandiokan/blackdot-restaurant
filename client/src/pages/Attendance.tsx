import { useMemo, useState } from "react";
import { Armchair, Clock3, TrendingUp, Users } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { EmptyState, PageHeader, Panel, SectionTitle, Segmented, StatCard } from "@/components/shared/Primitives";
import { formatLocalDate, getLocalMonth, getLocalWeek } from "@/lib/localDate";
import { countCovers, coversByDate, coversByTime, occupancyTone, reservationsForDates, type CoversPoint } from "@/lib/reservationMetrics";

type AttendanceRange = "Oggi" | "Questa settimana" | "Questo mese";

export default function Attendance() {
  const { currentDate, restaurant, reservations } = useAppData();
  const [range, setRange] = useState<AttendanceRange>("Oggi");
  const rangeDates = useMemo(() => range === "Oggi" ? [currentDate] : range === "Questa settimana" ? getLocalWeek(currentDate) : getLocalMonth(currentDate), [range, currentDate]);
  const rangeReservations = useMemo(() => reservationsForDates(reservations, rangeDates), [reservations, rangeDates]);
  const hourlyDistribution = useMemo(() => coversByTime(rangeReservations), [rangeReservations]);
  const dailyDistribution = useMemo(() => coversByDate(rangeReservations, rangeDates, (date) => range === "Questa settimana"
    ? capitalize(formatLocalDate(date, { weekday: "long" }))
    : formatLocalDate(date, { day: "numeric", month: "short" })), [rangeReservations, rangeDates, range]);
  const chartData = range === "Oggi" ? hourlyDistribution : dailyDistribution;
  const peak = chartData.reduce<CoversPoint | null>((best, item) => !best || item.value > best.value ? item : best, null);
  const lunchCapacity = restaurant?.lunchCapacity ?? 0;
  const dinnerCapacity = restaurant?.dinnerCapacity ?? 0;
  const dailyCapacity = lunchCapacity + dinnerCapacity;
  const periodCapacity = dailyCapacity * rangeDates.length;
  const totalCovers = countCovers(rangeReservations);
  const lunchCovers = countCovers(rangeReservations, "Pranzo");
  const dinnerCovers = countCovers(rangeReservations, "Cena");
  const occupancy = periodCapacity > 0 ? Math.round((totalCovers / periodCapacity) * 100) : 0;
  const allocatedReservations = rangeReservations.filter((item) => item.table && item.table !== "Da assegnare");
  const tableServices = new Set(allocatedReservations.map((item) => `${item.date}:${item.service}:${item.table}`)).size;
  const turnover = tableServices > 0 ? (allocatedReservations.length / tableServices).toFixed(1).replace(".", ",") : "0,0";
  const maxChartValue = Math.max(1, ...chartData.map((item) => item.value));
  const chartTitle = range === "Oggi" ? "Andamento della giornata" : range === "Questa settimana" ? "Coperti della settimana" : "Andamento del mese";
  const detailTitle = range === "Oggi" ? "Dettaglio fascia oraria" : range === "Questa settimana" ? "Dettaglio settimanale" : "Dettaglio mensile";
  const detailEmptyTitle = range === "Oggi" ? "Nessuna fascia occupata" : "Nessun giorno occupato";
  const chartClass = range === "Oggi" ? "today-chart" : range === "Questa settimana" ? "week-chart" : "month-chart";

  return <div className="page attendance-page">
    <PageHeader title="Affluenza" description="Analizza l’andamento delle prenotazioni e dell’occupazione." action={<Segmented options={["Oggi", "Questa settimana", "Questo mese"] as AttendanceRange[]} value={range} onChange={setRange} />} />
    <div className="stats-grid four"><StatCard icon={Users} value={totalCovers} label="Coperti prenotati" showArrow={false} /><StatCard icon={Armchair} value={Math.max(0, periodCapacity - totalCovers)} label="Posti disponibili" showArrow={false} /><StatCard icon={TrendingUp} value={`${occupancy}%`} label="Occupazione" tone="green" showArrow={false} /><StatCard icon={Clock3} value={turnover} label="Turnover medio" showArrow={false} /></div>
    <div className="attendance-grid">
      <Panel className="occupancy-chart-panel"><SectionTitle>{chartTitle}</SectionTitle>{chartData.some((item) => item.value > 0) ? <div className={`bar-chart large ${chartClass}`}>{chartData.map((item) => {
        const referenceCapacity = range === "Oggi" ? (item.key < "17:00" ? lunchCapacity : dinnerCapacity) : dailyCapacity;
        const percent = referenceCapacity > 0 ? Math.round((item.value / referenceCapacity) * 100) : 0;
        const barHeight = item.value === 0 ? 0 : Math.max(8, (item.value / maxChartValue) * 245);
        return <div key={item.key} className="bar-column"><span className={occupancyTone(percent)} style={{ height: `${barHeight}px` }}><i>{item.value}</i></span><small title={item.label}>{item.label}</small></div>;
      })}</div> : <EmptyState title="Nessuna affluenza prevista" description="Non ci sono prenotazioni attive nel periodo selezionato." />}</Panel>
      <Panel className="hour-detail"><SectionTitle>{detailTitle}</SectionTitle>{chartData.some((item) => item.value > 0) ? <div className="hour-detail-list">{chartData.map((item) => {
        const capacity = range === "Oggi" ? (item.key < "17:00" ? lunchCapacity : dinnerCapacity) : dailyCapacity;
        return <div key={item.key}><span>{item.label}</span><b>{item.value}</b><small>{capacity > 0 ? Math.round((item.value / capacity) * 100) : 0}%</small></div>;
      })}</div> : <EmptyState title={detailEmptyTitle} description="I dettagli appariranno con le prenotazioni del periodo." />}</Panel>
      <Panel className="service-donuts"><SectionTitle>Coperti per servizio</SectionTitle><div className="donut-row"><Donut value={lunchCovers} max={lunchCapacity * rangeDates.length} label="Pranzo" color="#43bf7e" /><Donut value={dinnerCovers} max={dinnerCapacity * rangeDates.length} label="Cena" color="#ef5a54" /></div></Panel>
    </div>
    <Panel className="insight-panel"><span>✦</span><div><b>Insight operativo</b><p>{insightForRange(range, peak)}</p></div></Panel>
  </div>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function insightForRange(range: AttendanceRange, peak: CoversPoint | null) {
  if (!peak || peak.value === 0) return "Nessun picco rilevato: non ci sono prenotazioni attive nel periodo selezionato.";
  if (range === "Oggi") return `Il picco orario della giornata è alle ${peak.label} con ${peak.value} coperti registrati.`;
  if (range === "Questa settimana") return `${peak.label} è il giorno con maggiore affluenza della settimana, con ${peak.value} coperti.`;
  return `Il giorno con maggiore affluenza del mese è ${peak.label}, con ${peak.value} coperti.`;
}

function Donut({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="donut-item"><div className="donut" style={{ background: `conic-gradient(${color} ${percent}%, #202729 0)` }}><span><b>{value}/{max}</b><small>{percent}%</small></span></div><strong>{label}</strong></div>;
}
