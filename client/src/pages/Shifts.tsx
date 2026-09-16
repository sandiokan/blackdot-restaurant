import { useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, PageHeader, Panel, PrimaryButton, Segmented } from "@/components/shared/Primitives";
import { useAppData } from "@/contexts/AppDataContext";
import type { Shift, ShiftInput, ShiftStatus, StaffArea } from "@/types/models";

const baseWeekStart = "2026-09-15";

type ShiftEditor = { shift: Shift | null; staffId: string; date: string };

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}

function displayTime(value: string | null) {
  if (!value) return "";
  return value === "23:59" ? "24" : value.replace(":00", "");
}

function shiftLabel(shift?: Shift) {
  if (!shift) return "—";
  if (shift.status === "rest") return "Riposo";
  if (shift.status === "cancelled") return "Annullato";
  return `${displayTime(shift.startTime)}–${displayTime(shift.endTime)}`;
}

function shiftClass(shift?: Shift) {
  if (!shift || shift.status === "rest" || shift.status === "cancelled") return "riposo";
  return shift.area.toLowerCase() as Lowercase<StaffArea>;
}

function dayParts(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(date);
  return [weekday.slice(0, 3), String(date.getDate())];
}

function weekLabel(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const month = new Intl.DateTimeFormat("it-IT", { month: "long" }).format(endDate);
  return `${startDate.getDate()} – ${endDate.getDate()} ${month} ${endDate.getFullYear()}`;
}

export default function Shifts() {
  const { staff, shifts, saving, addShift, updateShift } = useAppData();
  const [view, setView] = useState("Settimana");
  const [week, setWeek] = useState(0);
  const [editor, setEditor] = useState<ShiftEditor | null>(null);
  const weekStart = addDays(baseWeekStart, week * 7);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const shiftsByStaffAndDate = useMemo(() => new Map(shifts.map((shift) => [`${shift.staffId}:${shift.date}`, shift])), [shifts]);

  return <div className="page shifts-page">
    <PageHeader title="Turni" description="Organizza i turni di lavoro del tuo staff." action={<PrimaryButton onClick={() => staff[0] ? setEditor({ shift: null, staffId: staff[0].id, date: dates[0] }) : toast.error("Aggiungi prima un membro del personale")}><Plus size={18} />Nuovo turno</PrimaryButton>} />
    <div className="shift-toolbar"><div className="date-nav"><button onClick={() => setWeek((value) => value - 1)}><ChevronLeft /></button><b>{weekLabel(dates[0], dates[6])}</b><button onClick={() => setWeek((value) => value + 1)}><ChevronRight /></button></div><Segmented options={["Oggi", "Settimana", "Mese"]} value={view} onChange={setView} /></div>
    <Panel className="schedule-table-panel"><div className="shift-table"><div className="shift-grid header"><div />{dates.map((date) => <div key={date}>{dayParts(date).map((part) => <span key={part}>{part}</span>)}</div>)}</div>{staff.map((person) => <div className="shift-grid row" key={person.id}><div className="shift-person"><Avatar initials={person.initials} color={person.accent} size="sm" /><b>{person.name}</b></div>{dates.map((date) => { const shift = shiftsByStaffAndDate.get(`${person.id}:${date}`); return <button key={`${person.id}-${date}`} className={`shift-cell shift-${shiftClass(shift)}`} onClick={() => setEditor({ shift: shift ?? null, staffId: person.id, date })}>{shiftLabel(shift)}</button>; })}</div>)}</div></Panel>
    <div className="shift-legend"><span><i className="sala" />Turno sala</span><span><i className="cucina" />Turno cucina</span><span><i className="bar" />Turno bar</span><span><i className="riposo" />Riposo</span></div>
    {editor && <ShiftDialog editor={editor} saving={saving} staff={staff} onClose={() => setEditor(null)} onSave={async (input) => {
      try {
        if (editor.shift) await updateShift(editor.shift.id, input); else await addShift(input);
        toast.success(editor.shift ? "Turno aggiornato" : "Turno creato");
        setEditor(null);
      } catch (error) {
        toast.error("Salvataggio non riuscito", { description: error instanceof Error ? error.message : undefined });
      }
    }} />}
  </div>;
}

function ShiftDialog({ editor, saving, staff, onClose, onSave }: { editor: ShiftEditor; saving: boolean; staff: ReturnType<typeof useAppData>["staff"]; onClose: () => void; onSave: (input: ShiftInput) => Promise<void> }) {
  const selectedPerson = staff.find((person) => person.id === editor.staffId) ?? staff[0];
  const [form, setForm] = useState<ShiftInput>(editor.shift ? { staffId: editor.shift.staffId, date: editor.shift.date, startTime: editor.shift.startTime, endTime: editor.shift.endTime, area: editor.shift.area, status: editor.shift.status, notes: editor.shift.notes } : { staffId: editor.staffId, date: editor.date, startTime: "10:00", endTime: "18:00", area: selectedPerson?.area ?? "Sala", status: "scheduled", notes: "" });
  function update<K extends keyof ShiftInput>(field: K, value: ShiftInput[K]) { setForm((current) => ({ ...current, [field]: value })); }
  function changePerson(staffId: string) { const person = staff.find((item) => item.id === staffId); setForm((current) => ({ ...current, staffId, area: person?.area ?? current.area })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.status !== "rest" && (!form.startTime || !form.endTime)) { toast.error("Inserisci inizio e fine turno"); return; }
    void onSave({ ...form, startTime: form.status === "rest" ? null : form.startTime, endTime: form.status === "rest" ? null : form.endTime, notes: form.notes.trim() });
  }
  return <div className="dialog-backdrop" onMouseDown={onClose}><form className="reservation-dialog entity-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
    <div className="dialog-head"><div><p className="eyebrow">Turni</p><h2>{editor.shift ? "Modifica turno" : "Nuovo turno"}</h2></div><button type="button" onClick={onClose} aria-label="Chiudi"><X /></button></div>
    <div className="entity-form"><label className="field"><span>Membro del personale</span><select value={form.staffId} onChange={(event) => changePerson(event.target.value)} disabled={Boolean(editor.shift)}>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="field"><span>Data</span><input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label><label className="field"><span>Stato</span><select value={form.status} onChange={(event) => update("status", event.target.value as ShiftStatus)}><option value="scheduled">Programmato</option><option value="rest">Riposo</option><option value="cancelled">Annullato</option></select></label><label className="field"><span>Area</span><select value={form.area} onChange={(event) => update("area", event.target.value as StaffArea)}><option>Sala</option><option>Cucina</option><option>Bar</option><option>Amministrazione</option></select></label><label className="field"><span>Inizio</span><input type="time" value={form.startTime ?? ""} disabled={form.status === "rest"} onChange={(event) => update("startTime", event.target.value)} /></label><label className="field"><span>Fine</span><input type="time" value={form.endTime ?? ""} disabled={form.status === "rest"} onChange={(event) => update("endTime", event.target.value)} /></label><label className="field entity-span"><span>Note</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label></div>
    <PrimaryButton type="submit" className="entity-submit" disabled={saving}>{saving ? "Salvataggio..." : editor.shift ? "Salva modifiche" : "Crea turno"}</PrimaryButton>
  </form></div>;
}
