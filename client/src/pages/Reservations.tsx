import { useMemo, useState } from "react";
import { CalendarDays, Download, Globe2, MessageCircle, MoreHorizontal, Phone, Plus, Search, Table2, Users } from "lucide-react";
import { toast } from "sonner";
import ReservationDetail from "@/components/ReservationDetail";
import { useAppData } from "@/contexts/AppDataContext";
import { addLocalDays, formatLocalDate, getLocalDateRange, getLocalWeek } from "@/lib/localDate";
import { countCovers, isActiveReservation } from "@/lib/reservationMetrics";
import type { Reservation } from "@/types/models";
import { GhostButton, PageHeader, Panel, PrimaryButton, Segmented, StatCard, StatusBadge } from "@/components/shared/Primitives";

const sourceIcons = { Telefono: Phone, Sito: Globe2, WhatsApp: MessageCircle, "Walk-in": Users };
type ReservationRange = "Oggi" | "Domani" | "Questa settimana" | "Personalizza";

export default function Reservations() {
  const { currentDate, restaurant, reservations, setModalOpen, updateReservationStatus } = useAppData();
  const [range, setRange] = useState<ReservationRange>("Oggi");
  const [customStart, setCustomStart] = useState(currentDate);
  const [customEnd, setCustomEnd] = useState(currentDate);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tutti gli stati");
  const [source, setSource] = useState("Tutte le provenienze");
  const [selectedId, setSelectedId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const periodDates = useMemo(() => {
    if (range === "Domani") return [addLocalDays(currentDate, 1)];
    if (range === "Questa settimana") return getLocalWeek(currentDate);
    if (range === "Personalizza") return getLocalDateRange(customStart, customEnd);
    return [currentDate];
  }, [range, currentDate, customStart, customEnd]);
  const periodDateSet = useMemo(() => new Set(periodDates), [periodDates]);
  const periodReservations = useMemo(() => reservations.filter((item) => periodDateSet.has(item.date)), [reservations, periodDateSet]);
  const activePeriodReservations = useMemo(() => periodReservations.filter(isActiveReservation), [periodReservations]);
  const covers = countCovers(activePeriodReservations);
  const dailyCapacity = (restaurant?.lunchCapacity ?? 0) + (restaurant?.dinnerCapacity ?? 0);
  const periodCapacity = dailyCapacity * periodDates.length;
  const occupancy = periodCapacity > 0 ? Math.round((covers / periodCapacity) * 100) : 0;

  const filtered = useMemo(() => periodReservations.filter((item) => {
    const matchesQuery = `${item.name} ${item.phone} ${item.note}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "Tutti gli stati" || item.status === status;
    const matchesSource = source === "Tutte le provenienze" || item.source === source;
    return matchesQuery && matchesStatus && matchesSource;
  }), [periodReservations, query, status, source]);
  const selected = reservations.find((item) => item.id === selectedId);
  const dateLabel = periodDates.length === 1
    ? formatLocalDate(periodDates[0], { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : `${formatLocalDate(periodDates[0], { day: "numeric", month: "short" })} – ${formatLocalDate(periodDates[periodDates.length - 1], { day: "numeric", month: "short", year: "numeric" })}`;

  function select(item: Reservation) {
    setSelectedId(item.id);
    setDetailOpen(true);
  }

  function changeRange(next: ReservationRange) {
    setRange(next);
    if (next === "Personalizza") {
      setCustomStart(currentDate);
      setCustomEnd(currentDate);
    }
  }

  function navigateDay(days: number) {
    const baseDate = periodDates.length === 1 ? periodDates[0] : currentDate;
    const nextDate = addLocalDays(baseDate, days);
    setRange("Personalizza");
    setCustomStart(nextDate);
    setCustomEnd(nextDate);
  }

  function changeCustomStart(date: string) {
    setCustomStart(date);
    if (date > customEnd) setCustomEnd(date);
  }

  function changeCustomEnd(date: string) {
    setCustomEnd(date);
    if (date < customStart) setCustomStart(date);
  }

  return (
    <div className="page reservations-page">
      <div className="reservations-main">
        <PageHeader title="Prenotazioni" description="Gestisci tutte le prenotazioni del tuo ristorante." action={<PrimaryButton onClick={() => setModalOpen(true)}><Plus size={18} />Nuova prenotazione</PrimaryButton>} />
        <div className="reservations-toolbar"><Segmented options={["Oggi", "Domani", "Questa settimana", "Personalizza"] as ReservationRange[]} value={range} onChange={changeRange} /><div className="date-nav"><button onClick={() => navigateDay(-1)} aria-label="Giorno precedente">‹</button><b>{dateLabel}</b><button onClick={() => navigateDay(1)} aria-label="Giorno successivo">›</button></div></div>
        {range === "Personalizza" && <div className="reservation-custom-range"><label>Dal <input type="date" value={customStart} onChange={(event) => changeCustomStart(event.target.value)} /></label><label>Al <input type="date" value={customEnd} onChange={(event) => changeCustomEnd(event.target.value)} /></label></div>}
        <div className="stats-grid four compact-stats">
          <StatCard icon={CalendarDays} value={periodReservations.length} label="Prenotazioni" showArrow={false} />
          <StatCard icon={Users} value={covers} label="Coperti totali" showArrow={false} />
          <StatCard icon={Table2} value={Math.max(0, periodCapacity - covers)} label="Posti disponibili" showArrow={false} />
          <StatCard icon={Users} value={`${occupancy}%`} label="Occupazione" tone="green" showArrow={false} />
        </div>
        <div className="filter-row">
          <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca per nome, telefono, note..." /></label>
          <select aria-label="Filtra per stato" value={status} onChange={(event) => setStatus(event.target.value)}><option>Tutti gli stati</option><option value="confirmed">Confermata</option><option value="pending">In attesa</option><option value="cancelled">Cancellata</option></select>
          <select aria-label="Filtra per provenienza" value={source} onChange={(event) => setSource(event.target.value)}><option>Tutte le provenienze</option><option>Telefono</option><option>Sito</option><option>WhatsApp</option><option>Walk-in</option></select>
          <GhostButton onClick={() => toast.success("Esportazione simulata")}><Download size={16} />Esporta</GhostButton>
        </div>
        <Panel className="reservations-table-panel">
          <div className="table-scroll"><table className="reservations-table"><thead><tr><th>Orario ↑</th><th>Nome</th><th>Coperti</th><th>Provenienza</th><th>Stato</th><th>Note</th><th /></tr></thead><tbody>
            {filtered.map((item) => { const SourceIcon = sourceIcons[item.source]; return <tr key={item.id} className={selectedId === item.id ? "selected" : ""} onClick={() => select(item)}><td data-label="Orario"><b>{item.time}</b></td><td data-label="Nome">{item.name}</td><td data-label="Coperti">{item.guests}</td><td data-label="Provenienza"><span className="source-cell"><SourceIcon size={17} />{item.source}</span></td><td data-label="Stato"><StatusBadge status={item.status} /></td><td data-label="Note" className="note-cell">{item.note || "–"}</td><td><MoreHorizontal size={18} /></td></tr> })}
          </tbody></table></div>
          {filtered.length === 0 && <div className="table-empty">Nessuna prenotazione corrisponde ai filtri.</div>}
          <div className="pagination"><span>Mostra {filtered.length} di {periodReservations.length} prenotazioni</span><div><button>‹</button><button className="active">1</button><button>2</button><button>›</button></div></div>
        </Panel>
      </div>
      {selected && <ReservationDetail item={selected} open={detailOpen} onClose={() => setDetailOpen(false)} onStatus={(next) => updateReservationStatus(selected.id, next)} />}
    </div>
  );
}
