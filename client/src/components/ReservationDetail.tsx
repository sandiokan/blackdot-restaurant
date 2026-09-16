import { CalendarDays, Globe2, MessageCircle, MoreHorizontal, Phone, Table2, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { formatLocalDate } from "@/lib/localDate";
import type { Reservation, ReservationStatus } from "@/types/models";
import { Avatar, GhostButton, Panel, PrimaryButton, StatusBadge } from "@/components/shared/Primitives";

export default function ReservationDetail({ item, open, onClose, onStatus, overlay = false }: { item: Reservation; open: boolean; onClose: () => void; onStatus: (status: ReservationStatus) => Promise<Reservation>; overlay?: boolean }) {
  return <aside className={`reservation-detail ${overlay ? "reservation-detail-overlay" : ""} ${open ? "open" : ""}`}>
    <div className="detail-head"><div className="detail-person"><Avatar initials={item.name.split(" ").map((part) => part[0]).join("")} /><div><h2>{item.name}</h2><StatusBadge status={item.status} /></div></div><button onClick={onClose} aria-label="Chiudi dettagli"><X /></button></div>
    <div className="contact-actions"><button><Phone /></button><button>✉</button><button><MessageCircle /></button><button><MoreHorizontal /></button></div>
    <div className="detail-tabs"><button className="active">Dettagli</button><button>Note</button><button>Cronologia</button></div>
    <Panel className="detail-card"><DetailLine icon={CalendarDays} label="Data" value={formatLocalDate(item.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} /><DetailLine icon={Phone} label="Orario" value={item.time} /><DetailLine icon={Users} label="Coperti" value={`${item.guests} persone`} /><DetailLine icon={Table2} label="Tavolo" value={`${item.table || "Da assegnare"} · sala principale`} /><DetailLine icon={Globe2} label="Provenienza" value={item.source} /><DetailLine icon={MessageCircle} label="Note" value={item.note || "Nessuna nota"} /></Panel>
    <Panel className="detail-card special-card"><h3>Richieste speciali</h3><p>{item.note || "Nessuna richiesta particolare"}</p></Panel>
    <div className="detail-actions"><PrimaryButton onClick={() => toast.success("Modifica prenotazione aperta")}>Modifica prenotazione</PrimaryButton>{item.status === "pending" && <GhostButton onClick={() => void changeStatus("confirmed", "Prenotazione confermata")}>Conferma richiesta</GhostButton>}<GhostButton onClick={() => toast.success("Tavolo spostato")}>Sposta tavolo</GhostButton><button className="danger-button" onClick={() => void changeStatus("cancelled", "Prenotazione cancellata")}><Trash2 size={17} />Cancella prenotazione</button></div>
  </aside>;

  async function changeStatus(status: ReservationStatus, successMessage: string) {
    try {
      await onStatus(status);
      toast.success(successMessage);
    } catch (error) {
      toast.error("Aggiornamento non riuscito", { description: error instanceof Error ? error.message : undefined });
    }
  }
}

function DetailLine({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return <div className="detail-line"><Icon size={20} /><span><small>{label}</small><b>{value}</b></span></div>;
}
