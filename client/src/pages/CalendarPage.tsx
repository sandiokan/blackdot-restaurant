import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import ReservationDetail from "@/components/ReservationDetail";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Panel, PrimaryButton, SectionTitle, ServiceProgress, StatusBadge } from "@/components/shared/Primitives";
import { addLocalMonths, formatLocalDate, getLocalWeek } from "@/lib/localDate";
import { countCovers, minutesFromTime, occupancyTone, reservationsByTime, reservationsForDate } from "@/lib/reservationMetrics";
import type { Reservation } from "@/types/models";

type CalendarView = "Pranzo e Cena" | "Pranzo" | "Cena";
type TimelineRow = { kind: "service" | "closed"; start: number; end: number; top: number; height: number; label?: string };
type TimelineLayout = { rows: TimelineRow[]; height: number; topForTime: (time: string) => number };

const SLOT_MINUTES = 30;
const SERVICE_SLOT_HEIGHT = 46;
const CLOSED_ROW_HEIGHT = 34;
const MAX_VISIBLE_PER_SLOT = 2;
const VISUAL_LUNCH_START_MINUTES = 11 * 60;

function formatMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function buildTimeline(lunchClose: string, dinnerOpen: string, dinnerClose: string, view: CalendarView): TimelineLayout {
  const lunch = { start: VISUAL_LUNCH_START_MINUTES, end: minutesFromTime(lunchClose) };
  const dinner = { start: minutesFromTime(dinnerOpen), end: minutesFromTime(dinnerClose) };
  const services = (view === "Pranzo" ? [lunch] : view === "Cena" ? [dinner] : [lunch, dinner])
    .filter((service) => service.end > service.start)
    .sort((a, b) => a.start - b.start);

  const rows: TimelineRow[] = [];
  let offset = 0;
  let previousEnd = services[0]?.start ?? 0;

  services.forEach((service) => {
    if (service.start > previousEnd) {
      rows.push({ kind: "closed", start: previousEnd, end: service.start, top: offset, height: CLOSED_ROW_HEIGHT, label: `Chiuso ${formatMinutes(previousEnd)}–${formatMinutes(service.start)}` });
      offset += CLOSED_ROW_HEIGHT;
    }

    for (let start = service.start; start < service.end; start += SLOT_MINUTES) {
      const end = Math.min(start + SLOT_MINUTES, service.end);
      const height = SERVICE_SLOT_HEIGHT * ((end - start) / SLOT_MINUTES);
      rows.push({ kind: "service", start, end, top: offset, height });
      offset += height;
    }
    previousEnd = Math.max(previousEnd, service.end);
  });

  const topForTime = (time: string) => {
    const minutes = minutesFromTime(time);
    const row = rows.find((item) => item.kind === "service" && minutes >= item.start && minutes <= item.end);
    if (!row) return 0;
    return row.top + ((minutes - row.start) / (row.end - row.start)) * row.height;
  };

  return { rows, height: offset, topForTime };
}

export default function CalendarPage() {
  const { currentDate, restaurant, reservations, loading, setModalOpen, updateReservationStatus } = useAppData();
  const { canManageOperations } = useAuth();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [view, setView] = useState<CalendarView>("Pranzo e Cena");
  const [detailReservationId, setDetailReservationId] = useState<string | null>(null);
  const knownReservationIds = useRef<Set<string> | null>(null);
  const weekDates = useMemo(() => getLocalWeek(selectedDate), [selectedDate]);
  const timeline = useMemo(() => buildTimeline(restaurant?.lunchClose ?? "15:00", restaurant?.dinnerOpen ?? "19:00", restaurant?.dinnerClose ?? "23:00", view), [restaurant?.lunchClose, restaurant?.dinnerOpen, restaurant?.dinnerClose, view]);
  const selectedReservations = useMemo(() => reservations
    .filter((item) => item.date === selectedDate)
    .filter((item) => view === "Pranzo e Cena" || item.service === view)
    .sort((a, b) => a.time.localeCompare(b.time)), [reservations, selectedDate, view]);
  const lunchSlots = useMemo(() => reservationsByTime(selectedReservations.filter((item) => item.service === "Pranzo")), [selectedReservations]);
  const dinnerSlots = useMemo(() => reservationsByTime(selectedReservations.filter((item) => item.service === "Cena")), [selectedReservations]);
  const activeSelectedReservations = reservationsForDate(reservations, selectedDate);
  const lunch = countCovers(activeSelectedReservations, "Pranzo");
  const dinner = countCovers(activeSelectedReservations, "Cena");
  const lunchCapacity = restaurant?.lunchCapacity ?? 0;
  const dinnerCapacity = restaurant?.dinnerCapacity ?? 0;
  const monthLabel = formatLocalDate(selectedDate, { month: "long", year: "numeric" });
  const dayLabel = formatLocalDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const detailReservation = reservations.find((item) => item.id === detailReservationId);

  useEffect(() => {
    if (loading) return;
    const currentIds = new Set(reservations.map((item) => item.id));
    if (knownReservationIds.current === null) {
      knownReservationIds.current = currentIds;
      return;
    }
    const createdReservation = reservations.find((item) => !knownReservationIds.current?.has(item.id));
    knownReservationIds.current = currentIds;
    if (!createdReservation) return;
    setSelectedDate(createdReservation.date);
    if (view !== "Pranzo e Cena" && view !== createdReservation.service) setView("Pranzo e Cena");
  }, [loading, reservations, view]);

  function serviceTone(date: string, service: Reservation["service"], capacity: number) {
    const covers = countCovers(reservationsForDate(reservations, date), service);
    return covers === 0 ? "gray" : occupancyTone(capacity > 0 ? Math.round((covers / capacity) * 100) : 0);
  }

  return <div className="page calendar-page">
    <PageHeader title="Calendario" description="Visualizza e gestisci le prenotazioni, giorno per giorno." action={canManageOperations ? <PrimaryButton onClick={() => setModalOpen(true)}><Plus size={18} />Nuova prenotazione</PrimaryButton> : undefined} />
    <div className="calendar-controls"><button onClick={() => setSelectedDate(currentDate)}>Oggi</button><button onClick={() => setSelectedDate((date) => addLocalMonths(date, -1))}><ChevronLeft /></button><b>{monthLabel}</b><button onClick={() => setSelectedDate((date) => addLocalMonths(date, 1))}><ChevronRight /></button></div>
    <div className="week-strip">{weekDates.map((date) => <button key={date} onClick={() => setSelectedDate(date)} className={selectedDate === date ? "active" : ""}><small>{formatLocalDate(date, { weekday: "short" }).slice(0, 3)}</small><b>{formatLocalDate(date, { day: "numeric" })}</b><span><i className={serviceTone(date, "Pranzo", lunchCapacity)} /><i className={serviceTone(date, "Cena", dinnerCapacity)} /></span></button>)}</div>
    <Panel className="day-schedule">
      <SectionTitle>{dayLabel} <select aria-label="Vista" value={view} onChange={(event) => setView(event.target.value as CalendarView)}><option>Pranzo e Cena</option><option>Pranzo</option><option>Cena</option></select></SectionTitle>
      <div className="service-summary"><ServiceProgress label={`PRANZO · ${restaurant?.lunchOpen ?? "--:--"} – ${restaurant?.lunchClose ?? "--:--"}`} used={lunch} total={lunchCapacity} /><ServiceProgress label={`CENA · ${restaurant?.dinnerOpen ?? "--:--"} – ${restaurant?.dinnerClose ?? "--:--"}`} used={dinner} total={dinnerCapacity} /></div>
      <div className={`schedule-grid ${view === "Pranzo e Cena" ? "schedule-combined" : "schedule-single-service"}`} style={{ height: timeline.height, gridTemplateColumns: view === "Pranzo e Cena" ? undefined : "72px minmax(0, 1fr)" }}>
        <div className="timeline-background" aria-hidden="true">{timeline.rows.map((row) => <div key={`${row.kind}-${row.start}`} className={`timeline-row timeline-${row.kind}-row`} style={{ top: row.top, height: row.height }}>{row.label && <span>{row.label}</span>}</div>)}</div>
        <div className="time-axis">{timeline.rows.filter((row) => row.kind === "service").map((row, index) => <span key={row.start} className={index === 0 ? "first-time" : undefined} style={{ top: row.top }}>{formatMinutes(row.start)}</span>)}</div>
        {view !== "Cena" && <TimelineColumn className="lunch-column" slots={lunchSlots} timeline={timeline} onSelect={setDetailReservationId} />}
        {view !== "Pranzo" && <TimelineColumn className="dinner-column" slots={dinnerSlots} timeline={timeline} onSelect={setDetailReservationId} />}
        {selectedReservations.length === 0 && <div className="schedule-empty">Nessuna prenotazione per il giorno selezionato.</div>}
      </div>
    </Panel>
    <div className="calendar-legend"><span><i className="green" />Confermata</span><span><i className="gold" />In attesa</span><span><i className="red" />Cancellata</span><span><i className="gray" />Completata</span></div>
    {detailReservation && <ReservationDetail item={detailReservation} open onClose={() => setDetailReservationId(null)} onStatus={(status) => updateReservationStatus(detailReservation.id, status)} overlay />}
  </div>;
}

function TimelineColumn({ className, slots, timeline, onSelect }: { className: string; slots: ReturnType<typeof reservationsByTime>; timeline: TimelineLayout; onSelect: (id: string) => void }) {
  return <div className={`service-column ${className}`}>{slots.map(({ time, items }) => {
    const visible = items.slice(0, MAX_VISIBLE_PER_SLOT);
    const hidden = items.slice(MAX_VISIBLE_PER_SLOT);
    return <div key={time} className="reservation-slot-group" style={{ top: timeline.topForTime(time) }}>
      {visible.map((item) => <ReservationBlock key={item.id} item={item} compact={items.length > 1} />)}
      {hidden.length > 0 && <HiddenReservationsPopover time={time} items={hidden} onSelect={onSelect} />}
    </div>;
  })}</div>;
}

function HiddenReservationsPopover({ time, items, onSelect }: { time: string; items: Reservation[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button className="reservation-overflow" aria-label={`Mostra ${items.length} prenotazioni nascoste alle ${time}`}>+{items.length}</button></PopoverTrigger>
    <PopoverContent className="reservation-overflow-popover" align="end" side="top" sideOffset={8}>
      <strong className="overflow-popover-title">Altre prenotazioni · {time}</strong>
      <div className="overflow-reservation-list">{items.map((item) => <button key={item.id} onClick={() => { setOpen(false); onSelect(item.id); }}>
        <span><b>{item.name}</b><small>{item.time} · {item.guests} coperti · {item.table || "Da assegnare"}</small></span>
        <StatusBadge status={item.status} />
      </button>)}</div>
    </PopoverContent>
  </Popover>;
}

function ReservationBlock({ item, compact }: { item: Reservation; compact: boolean }) {
  return <button className={`reservation-block block-${item.status} ${compact ? "compact" : ""}`} title={`${item.time} · ${item.name} · ${item.guests} persone · ${item.table}`}><b>{item.time}</b><strong>{item.name}</strong><small>{item.guests} pers. · {item.table || "Da assegnare"}</small></button>;
}
