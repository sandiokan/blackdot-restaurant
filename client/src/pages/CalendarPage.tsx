import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { PageHeader, Panel, PrimaryButton, SectionTitle, ServiceProgress } from "@/components/shared/Primitives";
import { addLocalMonths, formatLocalDate, getLocalWeek } from "@/lib/localDate";
import { countCovers, occupancyTone, reservationsForDate } from "@/lib/reservationMetrics";
import type { Reservation } from "@/types/models";

type CalendarView = "Pranzo e Cena" | "Pranzo" | "Cena";

export default function CalendarPage() {
  const { currentDate, restaurant, reservations, setModalOpen } = useAppData();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [view, setView] = useState<CalendarView>("Pranzo e Cena");
  const weekDates = useMemo(() => getLocalWeek(selectedDate), [selectedDate]);
  const selectedReservations = useMemo(() => reservations
    .filter((item) => item.date === selectedDate)
    .filter((item) => view === "Pranzo e Cena" || item.service === view)
    .sort((a, b) => a.time.localeCompare(b.time)), [reservations, selectedDate, view]);
  const activeSelectedReservations = reservationsForDate(reservations, selectedDate);
  const lunch = countCovers(activeSelectedReservations, "Pranzo");
  const dinner = countCovers(activeSelectedReservations, "Cena");
  const lunchCapacity = restaurant?.lunchCapacity ?? 0;
  const dinnerCapacity = restaurant?.dinnerCapacity ?? 0;
  const monthLabel = formatLocalDate(selectedDate, { month: "long", year: "numeric" });
  const dayLabel = formatLocalDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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
      <div className="schedule-grid">
        <div className="time-axis">{["11:00", "12:00", "13:00", "14:00", "15:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].map((time) => <span key={time}>{time}</span>)}</div>
        <div className="service-column lunch-column">{selectedReservations.filter((item) => item.service === "Pranzo").map((item, index) => <ReservationBlock key={item.id} item={item} top={16 + index * 56} />)}</div>
        <div className="service-column dinner-column">{selectedReservations.filter((item) => item.service === "Cena").map((item, index) => <ReservationBlock key={item.id} item={item} top={235 + index * 48} />)}</div>
        {selectedReservations.length === 0 && <div className="schedule-empty">Nessuna prenotazione per il giorno selezionato.</div>}
      </div>
    </Panel>
    <div className="calendar-legend"><span><i className="green" />Confermata</span><span><i className="gold" />In attesa</span><span><i className="red" />Cancellata</span><span><i className="gray" />Completata</span></div>
  </div>;
}

function ReservationBlock({ item, top }: { item: Reservation; top: number }) {
  return <button className={`reservation-block block-${item.status}`} style={{ top }}><b>{item.time}</b><strong>{item.name}</strong><small>{item.guests} persone · {item.table}</small><MoreHorizontal size={16} /></button>;
}
