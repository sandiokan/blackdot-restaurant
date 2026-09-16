import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { PageHeader, Panel, PrimaryButton, SectionTitle, ServiceProgress } from "@/components/shared/Primitives";
import type { Reservation } from "@/types/models";

const days = [
  { label: "Lun", day: 14, tone: "green" }, { label: "Mar", day: 15, tone: "green" }, { label: "Mer", day: 16, tone: "green" },
  { label: "Gio", day: 17, tone: "red" }, { label: "Ven", day: 18, tone: "gold" }, { label: "Sab", day: 19, tone: "red" }, { label: "Dom", day: 20, tone: "red" },
];

export default function CalendarPage() {
  const { restaurant, reservations, lunchCovers, dinnerCovers, setModalOpen } = useAppData();
  const [selectedDay, setSelectedDay] = useState(16);
  const selectedReservations = selectedDay === 16 ? reservations : [];
  const lunch = selectedDay === 16 ? lunchCovers : 0;
  const dinner = selectedDay === 16 ? dinnerCovers : 0;

  return <div className="page calendar-page">
    <PageHeader title="Calendario" description="Visualizza e gestisci le prenotazioni, giorno per giorno." action={<PrimaryButton onClick={() => setModalOpen(true)}><Plus size={18} />Nuova prenotazione</PrimaryButton>} />
    <div className="calendar-controls"><button>Oggi</button><button><ChevronLeft /></button><b>Settembre 2026</b><button><ChevronRight /></button></div>
    <div className="week-strip">{days.map((item) => <button key={item.day} onClick={() => setSelectedDay(item.day)} className={selectedDay === item.day ? "active" : ""}><small>{item.label}</small><b>{item.day}</b><span><i className={item.tone} /><i className={item.day % 2 ? "gold" : "green"} /></span></button>)}</div>
    <Panel className="day-schedule">
      <SectionTitle>Martedì {selectedDay} settembre 2026 <select aria-label="Vista"><option>Pranzo e Cena</option><option>Pranzo</option><option>Cena</option></select></SectionTitle>
      <div className="service-summary"><ServiceProgress label={`PRANZO · ${restaurant?.lunchOpen ?? "12:00"} – ${restaurant?.lunchClose ?? "15:00"}`} used={lunch} total={restaurant?.lunchCapacity ?? 80} /><ServiceProgress label={`CENA · ${restaurant?.dinnerOpen ?? "19:00"} – ${restaurant?.dinnerClose ?? "23:00"}`} used={dinner} total={restaurant?.dinnerCapacity ?? 80} /></div>
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
  return <button className={`reservation-block block-${item.status}`} style={{ top }}><b>{item.time}</b><strong>{item.name.split(" ").pop()}</strong><small>{item.guests} persone · {item.table}</small><MoreHorizontal size={16} /></button>;
}
