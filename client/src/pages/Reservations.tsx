import { useMemo, useState } from "react";
import { CalendarDays, Download, Globe2, MessageCircle, MoreHorizontal, Phone, Plus, Search, Table2, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/contexts/AppDataContext";
import { TODAY } from "@/data/mockData";
import type { Reservation, ReservationStatus } from "@/types/models";
import { Avatar, GhostButton, PageHeader, Panel, PrimaryButton, Segmented, StatCard, StatusBadge } from "@/components/shared/Primitives";

const sourceIcons = { Telefono: Phone, Sito: Globe2, WhatsApp: MessageCircle, "Walk-in": Users };

export default function Reservations() {
  const { restaurant, reservations, totalCovers, setModalOpen, updateReservationStatus } = useAppData();
  const [range, setRange] = useState("Oggi");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tutti gli stati");
  const [source, setSource] = useState("Tutte le provenienze");
  const [selectedId, setSelectedId] = useState("r9");
  const [detailOpen, setDetailOpen] = useState(false);
  const todayReservations = reservations.filter((item) => item.date === TODAY);
  const totalCapacity = (restaurant?.lunchCapacity ?? 80) + (restaurant?.dinnerCapacity ?? 80);

  const filtered = useMemo(() => reservations.filter((item) => {
    const matchesQuery = `${item.name} ${item.phone} ${item.note}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "Tutti gli stati" || item.status === status;
    const matchesSource = source === "Tutte le provenienze" || item.source === source;
    return matchesQuery && matchesStatus && matchesSource;
  }), [reservations, query, status, source]);
  const selected = reservations.find((item) => item.id === selectedId) ?? reservations[0];

  function select(item: Reservation) {
    setSelectedId(item.id);
    setDetailOpen(true);
  }

  return (
    <div className="page reservations-page">
      <div className="reservations-main">
        <PageHeader title="Prenotazioni" description="Gestisci tutte le prenotazioni del tuo ristorante." action={<PrimaryButton onClick={() => setModalOpen(true)}><Plus size={18} />Nuova prenotazione</PrimaryButton>} />
        <div className="reservations-toolbar"><Segmented options={["Oggi", "Domani", "Questa settimana", "Personalizza"]} value={range} onChange={setRange} /><div className="date-nav"><button>‹</button><b>Martedì 16 settembre 2026</b><button>›</button></div></div>
        <div className="stats-grid four compact-stats">
          <StatCard icon={CalendarDays} value={todayReservations.length} label="Prenotazioni" />
          <StatCard icon={Users} value={totalCovers} label="Coperti totali" />
          <StatCard icon={Table2} value={Math.max(0, totalCapacity - totalCovers)} label="Posti disponibili" />
          <StatCard icon={Users} value={`${Math.round((totalCovers / totalCapacity) * 100)}%`} label="Occupazione" tone="green" />
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
          <div className="pagination"><span>Mostra {filtered.length} di {reservations.length} prenotazioni</span><div><button>‹</button><button className="active">1</button><button>2</button><button>›</button></div></div>
        </Panel>
      </div>
      {selected && <ReservationDetail item={selected} open={detailOpen} onClose={() => setDetailOpen(false)} onStatus={(next) => updateReservationStatus(selected.id, next)} />}
    </div>
  );
}

function ReservationDetail({ item, open, onClose, onStatus }: { item: Reservation; open: boolean; onClose: () => void; onStatus: (status: ReservationStatus) => Promise<Reservation> }) {
  return <aside className={`reservation-detail ${open ? "open" : ""}`}>
    <div className="detail-head"><div className="detail-person"><Avatar initials={item.name.split(" ").map((part) => part[0]).join("")} /><div><h2>{item.name}</h2><StatusBadge status={item.status} /></div></div><button onClick={onClose}><X /></button></div>
    <div className="contact-actions"><button><Phone /></button><button>✉</button><button><MessageCircle /></button><button><MoreHorizontal /></button></div>
    <div className="detail-tabs"><button className="active">Dettagli</button><button>Note</button><button>Cronologia</button></div>
    <Panel className="detail-card"><DetailLine icon={CalendarDays} label="Data" value="Martedì 16 settembre 2026" /><DetailLine icon={Phone} label="Orario" value={item.time} /><DetailLine icon={Users} label="Coperti" value={`${item.guests} persone`} /><DetailLine icon={Table2} label="Tavolo" value={`${item.table} · sala principale`} /><DetailLine icon={Globe2} label="Provenienza" value={item.source} /><DetailLine icon={MessageCircle} label="Note" value={item.note || "Nessuna nota"} /></Panel>
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
