import { useMemo, useState, type FormEvent } from "react";
import { MoreVertical, Plus, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, PageHeader, Panel, PrimaryButton, SectionTitle, Segmented } from "@/components/shared/Primitives";
import { useAppData } from "@/contexts/AppDataContext";
import type { Shift, StaffArea, StaffInput, StaffMember, StaffStatus } from "@/types/models";

const filters = ["Tutti", "Sala", "Cucina", "Bar", "Amministrazione"] as const;
const emptyStaff: StaffInput = { name: "", role: "", area: "Sala", phone: "", email: "", status: "upcoming" };

function displayTime(value: string | null) {
  if (!value) return "";
  return value === "23:59" ? "24:00" : value;
}

function shiftLabel(shift?: Shift) {
  if (!shift) return "—";
  if (shift.status === "rest") return "Riposo";
  if (shift.status === "cancelled") return "Turno annullato";
  return `${displayTime(shift.startTime)} – ${displayTime(shift.endTime)}`;
}

function italianDate(dateString: string) {
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${dateString}T12:00:00`));
}

export default function Staff() {
  const { currentDate, staff, shifts, staffOnDuty, staffOnDutyByArea, saving, addStaff, updateStaff } = useAppData();
  const [filter, setFilter] = useState<StaffArea | "Tutti">("Tutti");
  const [editing, setEditing] = useState<StaffMember | null | undefined>(undefined);
  const visible = staff.filter((item) => filter === "Tutti" || item.area === filter);
  const todayShifts = useMemo(() => new Map(shifts.filter((shift) => shift.date === currentDate).map((shift) => [shift.staffId, shift])), [shifts, currentDate]);
  const nextShifts = useMemo(() => shifts
    .filter((shift) => shift.date > currentDate && shift.status === "scheduled")
    .filter((shift, index, items) => items.findIndex((item) => item.staffId === shift.staffId) === index)
    .slice(0, 5), [shifts, currentDate]);

  return <div className="page staff-page">
    <PageHeader title="Personale" description="Gestisci il tuo team e i relativi ruoli." action={<PrimaryButton onClick={() => setEditing(null)}><Plus size={18} />Aggiungi membro</PrimaryButton>} />
    <Segmented options={[...filters]} value={filter} onChange={setFilter} />
    <div className="staff-layout">
      <div className="staff-content"><div className="staff-grid">{visible.map((person) => {
        const todayShift = todayShifts.get(person.id);
        const isOnDuty = staffOnDuty.some((item) => item.id === person.id);
        const hasScheduledShift = todayShift?.status === "scheduled";
        return <Panel key={person.id} className="staff-card" interactive><button className="staff-more" onClick={() => setEditing(person)} aria-label={`Modifica ${person.name}`}><MoreVertical size={18} /></button><Avatar initials={person.initials} color={person.accent} size="lg" /><div className="staff-identity"><h3>{person.name}</h3><p>{person.role}</p></div><div className={`staff-status staff-${isOnDuty ? "working" : hasScheduledShift ? "upcoming" : "absent"}`}><i />{isOnDuty ? "In servizio" : hasScheduledShift ? "Turno assegnato" : "Non in servizio"}</div><strong>{shiftLabel(todayShift)}</strong></Panel>;
      })}</div>
        <Panel className="shift-summary"><SectionTitle>Riepilogo turno di oggi</SectionTitle><div><span><UserCheck />Persone in servizio<b>{staffOnDuty.length}</b></span><span>Sala<b>{staffOnDutyByArea.Sala}</b></span><span>Cucina<b>{staffOnDutyByArea.Cucina}</b></span><span>Bar<b>{staffOnDutyByArea.Bar}</b></span></div></Panel>
      </div>
      <Panel className="next-shifts"><SectionTitle>Prossimi turni</SectionTitle>{nextShifts.map((shift) => { const person = staff.find((item) => item.id === shift.staffId); if (!person) return null; return <div className="next-shift" key={shift.id}><Avatar initials={person.initials} color={person.accent} size="sm" /><span><b>{person.name}</b><small>{italianDate(shift.date)} · {shiftLabel(shift)}</small></span><MoreVertical size={16} /></div>; })}<button onClick={() => location.assign("/turni")}>Vedi tutti i turni</button></Panel>
    </div>
    {editing !== undefined && <StaffDialog person={editing} saving={saving} onClose={() => setEditing(undefined)} onSave={async (input) => {
      try {
        if (editing) await updateStaff(editing.id, input); else await addStaff(input);
        toast.success(editing ? "Membro aggiornato" : "Membro aggiunto");
        setEditing(undefined);
      } catch (error) {
        toast.error("Salvataggio non riuscito", { description: error instanceof Error ? error.message : undefined });
      }
    }} />}
  </div>;
}

function StaffDialog({ person, saving, onClose, onSave }: { person: StaffMember | null; saving: boolean; onClose: () => void; onSave: (input: StaffInput) => Promise<void> }) {
  const [form, setForm] = useState<StaffInput>(person ? { name: person.name, role: person.role, area: person.area, phone: person.phone, email: person.email, status: person.status } : emptyStaff);
  function update<K extends keyof StaffInput>(field: K, value: StaffInput[K]) { setForm((current) => ({ ...current, [field]: value })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.role.trim()) { toast.error("Inserisci nome e ruolo"); return; }
    void onSave({ ...form, name: form.name.trim(), role: form.role.trim(), phone: form.phone.trim(), email: form.email.trim() });
  }
  return <div className="dialog-backdrop" onMouseDown={onClose}><form className="reservation-dialog entity-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
    <div className="dialog-head"><div><p className="eyebrow">Personale</p><h2>{person ? "Modifica membro" : "Aggiungi membro"}</h2></div><button type="button" onClick={onClose} aria-label="Chiudi"><X /></button></div>
    <div className="entity-form"><label className="field"><span>Nome e cognome</span><input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} /></label><label className="field"><span>Ruolo</span><input value={form.role} onChange={(event) => update("role", event.target.value)} /></label><label className="field"><span>Area</span><select value={form.area} onChange={(event) => update("area", event.target.value as StaffArea)}><option>Sala</option><option>Cucina</option><option>Bar</option><option>Amministrazione</option></select></label><label className="field"><span>Stato</span><select value={form.status} onChange={(event) => update("status", event.target.value as StaffStatus)}><option value="working">In servizio</option><option value="upcoming">In servizio più tardi</option><option value="absent">Non in servizio</option></select></label><label className="field"><span>Telefono</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label><label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label></div>
    <PrimaryButton type="submit" className="entity-submit" disabled={saving}>{saving ? "Salvataggio..." : person ? "Salva modifiche" : "Aggiungi membro"}</PrimaryButton>
  </form></div>;
}
