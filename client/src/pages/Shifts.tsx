import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { schedules, staffMembers } from "@/data/mockData";
import { Avatar, PageHeader, Panel, PrimaryButton, Segmented } from "@/components/shared/Primitives";

const days = ["Lun 15", "Mar 16", "Mer 17", "Gio 18", "Ven 19", "Sab 20", "Dom 21"];

export default function Shifts() {
  const [view, setView] = useState("Settimana");
  const [week, setWeek] = useState(0);
  return <div className="page shifts-page">
    <PageHeader title="Turni" description="Organizza i turni di lavoro del tuo staff." action={<PrimaryButton onClick={() => toast.success("Nuovo turno pronto da compilare")}><Plus size={18} />Nuovo turno</PrimaryButton>} />
    <div className="shift-toolbar"><div className="date-nav"><button onClick={() => setWeek((value) => value - 1)}><ChevronLeft /></button><b>{week === 0 ? "15 – 21 settembre 2026" : week < 0 ? "8 – 14 settembre 2026" : "22 – 28 settembre 2026"}</b><button onClick={() => setWeek((value) => value + 1)}><ChevronRight /></button></div><Segmented options={["Oggi", "Settimana", "Mese"]} value={view} onChange={setView} /></div>
    <Panel className="schedule-table-panel"><div className="shift-table"><div className="shift-grid header"><div /><>{days.map((day) => <div key={day}>{day.split(" ").map((part) => <span key={part}>{part}</span>)}</div>)}</></div>{schedules.map((schedule) => { const person = staffMembers.find((item) => item.id === schedule.staffId)!; return <div className="shift-grid row" key={schedule.staffId}><div className="shift-person"><Avatar initials={person.initials} color={person.accent} size="sm" /><b>{person.name}</b></div>{schedule.shifts.map((shift, index) => <button key={`${schedule.staffId}-${index}`} className={`shift-cell shift-${shift.type}`} onClick={() => toast.success(`Turno ${person.name}: ${shift.label}`)}>{shift.label}</button>)}</div>})}</div></Panel>
    <div className="shift-legend"><span><i className="sala" />Turno sala</span><span><i className="cucina" />Turno cucina</span><span><i className="bar" />Turno bar</span><span><i className="riposo" />Riposo</span></div>
  </div>;
}
