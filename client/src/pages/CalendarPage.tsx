import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { PageHeader, Panel, PrimaryButton, SectionTitle, ServiceProgress } from "@/components/shared/Primitives";
import { addLocalMonths, formatLocalDate, getLocalWeek } from "@/lib/localDate";
import { countCovers, minutesFromTime, occupancyTone, reservationsByTime, reservationsForDate } from "@/lib/reservationMetrics";
import type { Reservation } from "@/types/models";

type CalendarView = "Pranzo e Cena" | "Pranzo" | "Cena";

const TIMELINE_START_MINUTES = 11 * 60;
const TIMELINE_END_MINUTES = 24 * 60;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 30;
const MAX_VISIBLE_PER_SLOT = 2;
const timelineTimes = Array.from(
  { length: (TIMELINE_END_MINUTES - TIMELINE_START_MINUTES) / SLOT_MINUTES },
  (_, index) => {
    const minutes = TIMELINE_START_MINUTES + index * SLOT_MINUTES;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  },
);
const timelineHeight = timelineTimes.length * SLOT_HEIGHT;

export default function CalendarPage() {
  const { currentDate, restaurant, reservations, loading, setModalOpen } = useAppData();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [view, setView] = useState<CalendarView>("Pranzo e Cena");
  const knownReservationIds = useRef<Set<string> | null>(null);
  const weekDates = useMemo(() => getLocalWeek(selectedDate), [selectedDate]);
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
    <PageHeader title="Calendario" description="Visualizza e gestisci le prenotazioni, giorno per giorno." action={<PrimaryButton onClick={() => setModalOpen(true)}><Plus size={18} />Nuova prenotazione</PrimaryButton>} />
    <div className="calendar-controls"><button onClick={() => setSelectedDate(currentDate)}>Oggi</button><button onClick={() => setSelectedDate((date) => addLocalMonths(date, -1))}><ChevronLeft /></button><b>{monthLabel}</b><button onClick={() => setSelectedDate((date) => addLocalMonths(date, 1))}><ChevronRight /></button></div>
    <div className="week-strip">{weekDates.map((date) => <button key={date} onClick={() => setSelectedDate(date)} className={selectedDate === date ? "active" : ""}><small>{formatLocalDate(date, { weekday: "short" }).slice(0, 3)}</small><b>{formatLocalDate(date, { day: "numeric" })}</b><span><i className={serviceTone(date, "Pranzo", lunchCapacity)} /><i className={serviceTone(date, "Cena", dinnerCapacity)} /></span></button>)}</div>
    <Panel className="day-schedule">
      <SectionTitle>{dayLabel} <select aria-label="Vista" value={view} onChange={(event) => setView(event.target.value as CalendarView)}><option>Pranzo e Cena</option><option>Pranzo</option><option>Cena</option></select></SectionTitle>
      <div className="service-summary"><ServiceProgress label={`PRANZO · ${restaurant?.lunchOpen ?? "--:--"} – ${restaurant?.lunchClose ?? "--:--"}`} used={lunch} total={lunchCapacity} /><ServiceProgress label={`CENA · ${restaurant?.dinnerOpen ?? "--:--"} – ${restaurant?.dinnerClose ?? "--:--"}`} used={dinner} total={dinnerCapacity} /></div>
      <div className="schedule-grid" style={{ height: timelineHeight }}>
        <div className="time-axis">{timelineTimes.map((time) => <span key={time} style={{ top: slotTop(time) }}>{time}</span>)}</div>
        <TimelineColumn className="lunch-column" slots={lunchSlots} />
        <TimelineColumn className="dinner-column" slots={dinnerSlots} />
        {selectedReservations.length === 0 && <div className="schedule-empty">Nessuna prenotazione per il giorno selezionato.</div>}
      </div>
    </Panel>
    <div className="calendar-legend"><span><i className="green" />Confermata</span><span><i className="gold" />In attesa</span><span><i className="red" />Cancellata</span><span><i className="gray" />Completata</span></div>
  </div>;
}

function slotTop(time: string) {
  return ((minutesFromTime(time) - TIMELINE_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT;
}

function TimelineColumn({ className, slots }: { className: string; slots: ReturnType<typeof reservationsByTime> }) {
  return <div className={`service-column ${className}`}>{slots.map(({ time, items }) => {
    const visible = items.slice(0, MAX_VISIBLE_PER_SLOT);
    const hidden = items.length - visible.length;
    return <div key={time} className="reservation-slot-group" style={{ top: slotTop(time) }}>
      {visible.map((item) => <ReservationBlock key={item.id} item={item} compact={items.length > 1} />)}
      {hidden > 0 && <span className="reservation-overflow" title={`${hidden} altre prenotazioni alle ${time}`}>+{hidden}</span>}
    </div>;
  })}</div>;
}

function ReservationBlock({ item, compact }: { item: Reservation; compact: boolean }) {
  return <button className={`reservation-block block-${item.status} ${compact ? "compact" : ""}`} title={`${item.time} · ${item.name} · ${item.guests} persone · ${item.table}`}><b>{item.time}</b><strong>{item.name}</strong><small>{item.guests} persone · {item.table}</small></button>;
}
