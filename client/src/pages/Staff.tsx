import { useState } from "react";
import { MoreVertical, Plus, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { staffMembers } from "@/data/mockData";
import { Avatar, PageHeader, Panel, PrimaryButton, SectionTitle, Segmented } from "@/components/shared/Primitives";
import type { StaffArea } from "@/types/models";

export default function Staff() {
  const [filter, setFilter] = useState("Tutti");
  const filters = ["Tutti", "Sala", "Cucina", "Bar", "Amministrazione"];
  const visible = staffMembers.filter((item) => filter === "Tutti" || item.area === filter);

  return <div className="page staff-page">
    <PageHeader title="Personale" description="Gestisci il tuo team e i relativi ruoli." action={<PrimaryButton onClick={() => toast.success("Modulo nuovo membro aperto")}><Plus size={18} />Aggiungi membro</PrimaryButton>} />
    <Segmented options={filters as (StaffArea | "Tutti")[]} value={filter as StaffArea | "Tutti"} onChange={setFilter} />
    <div className="staff-layout">
      <div className="staff-content"><div className="staff-grid">{visible.map((person) => <Panel key={person.id} className="staff-card" interactive><button className="staff-more"><MoreVertical size={18} /></button><Avatar initials={person.initials} color={person.accent} size="lg" /><div className="staff-identity"><h3>{person.name}</h3><p>{person.role}</p></div><div className={`staff-status staff-${person.status}`}><i />{person.status === "working" ? "In servizio" : person.status === "upcoming" ? "In servizio più tardi" : "Non in servizio"}</div><strong>{person.shift}</strong></Panel>)}</div>
        <Panel className="shift-summary"><SectionTitle>Riepilogo turno di oggi</SectionTitle><div><span><UserCheck />Persone in servizio<b>8</b></span><span>Sala<b>4</b></span><span>Cucina<b>3</b></span><span>Bar<b>1</b></span></div></Panel>
      </div>
      <Panel className="next-shifts"><SectionTitle>Prossimi turni</SectionTitle>{staffMembers.slice(0, 5).map((person, index) => <div className="next-shift" key={person.id}><Avatar initials={person.initials} color={person.accent} size="sm" /><span><b>{person.name}</b><small>{index < 2 ? "Mer 17 set" : "Gio 18 set"} · {person.shift}</small></span><MoreVertical size={16} /></div>)}<button onClick={() => location.assign("/turni")}>Vedi tutti i turni</button></Panel>
    </div>
  </div>;
}
