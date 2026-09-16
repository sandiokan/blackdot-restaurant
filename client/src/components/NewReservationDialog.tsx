import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, Minus, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/contexts/AppDataContext";
import { addLocalDays } from "@/lib/localDate";
import type { ReservationSource, ServiceType } from "@/types/models";
import { PrimaryButton, Segmented } from "@/components/shared/Primitives";

const times: Record<ServiceType, string[]> = {
  Pranzo: ["12:30", "13:00", "13:30", "14:00"],
  Cena: ["19:30", "20:00", "20:30", "21:00", "21:30"],
};

export default function NewReservationDialog() {
  const { currentDate, modalOpen, setModalOpen, addReservation, reservations, restaurant, saving } = useAppData();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("Oggi");
  const [customDate, setCustomDate] = useState(currentDate);
  const [service, setService] = useState<ServiceType>("Cena");
  const [time, setTime] = useState("20:00");
  const [guests, setGuests] = useState(4);
  const [source, setSource] = useState<ReservationSource>("Telefono");
  const [note, setNote] = useState("");

  const selectedDate = day === "Oggi" ? currentDate : day === "Domani" ? addLocalDays(currentDate, 1) : customDate;
  const capacity = service === "Pranzo" ? restaurant?.lunchCapacity ?? 0 : restaurant?.dinnerCapacity ?? 0;
  const availability = useMemo(() => {
    const occupied = reservations
      .filter((item) => item.date === selectedDate && item.service === service && item.status !== "cancelled")
      .reduce((sum, item) => sum + item.guests, 0);
    return Math.max(0, capacity - occupied);
  }, [reservations, selectedDate, service, capacity]);

  if (!modalOpen) return null;

  function close() {
    if (!saving) setModalOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Inserisci nome e telefono");
      return;
    }
    if (!selectedDate) {
      toast.error("Seleziona una data");
      return;
    }
    if (guests > availability) {
      toast.error("Coperti non disponibili", { description: `Disponibilità residua: ${availability}` });
      return;
    }

    try {
      await addReservation({
        date: selectedDate,
        time,
        name: name.trim(),
        phone: phone.trim(),
        guests,
        source,
        status: "confirmed",
        note: note.trim(),
        table: "Da assegnare",
        service,
      });
      toast.success("Prenotazione confermata", { description: `${name}, ${guests} persone alle ${time}` });
      setName("");
      setPhone("");
      setNote("");
      close();
    } catch (error) {
      toast.error("Prenotazione non salvata", { description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={close}>
      <form className="reservation-dialog" onSubmit={(event) => void submit(event)} onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-head"><div><p className="eyebrow">Prenotazione rapida</p><h2>Nuova prenotazione</h2></div><button type="button" onClick={close} aria-label="Chiudi"><X /></button></div>
        <div className="dialog-grid">
          <div className="dialog-form">
            <label className="field"><span>Nome e cognome</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Mario Rossi" /></label>
            <label className="field"><span>Telefono</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+39 333 1234567" /></label>
            <div className="field"><span>Data</span><Segmented options={["Oggi", "Domani", "Scegli data"]} value={day} onChange={setDay} />{day === "Scegli data" && <input className="custom-date-input" type="date" min={currentDate} value={customDate} onChange={(event) => setCustomDate(event.target.value)} />}</div>
            <div className="field"><span>Servizio</span><Segmented options={["Pranzo", "Cena"] as ServiceType[]} value={service} onChange={(value) => { setService(value); setTime(times[value][1]); }} /></div>
            <div className="field"><span>Orario</span><div className="time-options">{times[service].map((slot) => <button type="button" key={slot} className={time === slot ? "active" : ""} onClick={() => setTime(slot)}>{slot}</button>)}</div></div>
            <div className="field inline-field"><span>Persone</span><div className="stepper"><button type="button" onClick={() => setGuests((value) => Math.max(1, value - 1))}><Minus size={16} /></button><b>{guests}</b><button type="button" onClick={() => setGuests((value) => Math.min(20, value + 1))}><Plus size={16} /></button></div></div>
            <label className="field"><span>Provenienza</span><select value={source} onChange={(event) => setSource(event.target.value as ReservationSource)}><option>Telefono</option><option>Sito</option><option>WhatsApp</option><option>Walk-in</option></select></label>
            <label className="field"><span>Note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Richieste o allergie" /></label>
          </div>
          <aside className="availability-panel">
            <p>Disponibilità in tempo reale</p>
            <div className="availability-score"><span><Check /></span><div><strong>{availability} coperti</strong><small>disponibili nel servizio {service.toLowerCase()}</small></div></div>
            <div className="availability-meta"><CalendarDays size={18} /><span>{selectedDate}, {service.toLowerCase()}</span></div>
            <div className="availability-meta"><Users size={18} /><span>Richiesta per {guests} persone</span></div>
            <div className="suggestions"><b>Suggerimenti</b><label><input type="radio" name="table" defaultChecked /> Tavolo 4 ({Math.max(4, guests)} coperti)</label><label><input type="radio" name="table" /> Tavolo 7 (6 coperti)</label><label><input type="radio" name="table" /> Tavolo 10 (8 coperti)</label></div>
          </aside>
        </div>
        <PrimaryButton type="submit" className="dialog-submit" disabled={saving || !restaurant}>{saving ? "Salvataggio..." : "Conferma prenotazione"}</PrimaryButton>
      </form>
    </div>
  );
}
