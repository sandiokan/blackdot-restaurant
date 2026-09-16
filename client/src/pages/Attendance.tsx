import { useState } from "react";
import { Armchair, Clock3, TrendingUp, Users } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { occupancyHours } from "@/data/mockData";
import { PageHeader, Panel, SectionTitle, Segmented, StatCard } from "@/components/shared/Primitives";

export default function Attendance() {
  const { totalCovers, lunchCovers, dinnerCovers } = useAppData();
  const [range, setRange] = useState("Oggi");
  const peak = occupancyHours.reduce((best, item) => item.value > best.value ? item : best);

  return <div className="page attendance-page">
    <PageHeader title="Affluenza" description="Analizza l’andamento delle prenotazioni e dell’occupazione." action={<Segmented options={["Oggi", "Questa settimana", "Questo mese"]} value={range} onChange={setRange} />} />
    <div className="stats-grid four"><StatCard icon={Users} value={totalCovers} label="Coperti prenotati" /><StatCard icon={Armchair} value={100 - totalCovers} label="Posti disponibili" /><StatCard icon={TrendingUp} value={`${totalCovers}%`} label="Occupazione" tone="green" /><StatCard icon={Clock3} value="2,3" label="Turnover medio" /></div>
    <div className="attendance-grid">
      <Panel className="occupancy-chart-panel"><SectionTitle>Andamento della giornata</SectionTitle><div className="bar-chart large">{occupancyHours.map((item) => <div key={item.time} className="bar-column"><span className={item.value >= 30 ? "red" : item.value >= 20 ? "gold" : "green"} style={{ height: `${Math.max(12, item.value * 4)}px` }}><i>{item.value}</i></span><small>{item.time}</small></div>)}</div></Panel>
      <Panel className="hour-detail"><SectionTitle>Dettaglio fascia oraria</SectionTitle><div className="hour-detail-list">{occupancyHours.slice(0, 8).map((item) => <div key={item.time}><span>{item.time}</span><b>{item.value}</b><small>{Math.round((item.value / 40) * 100)}%</small></div>)}</div></Panel>
      <Panel className="service-donuts"><SectionTitle>Coperti per servizio</SectionTitle><div className="donut-row"><Donut value={lunchCovers} max={80} label="Pranzo" color="#43bf7e" /><Donut value={dinnerCovers} max={80} label="Cena" color="#ef5a54" /></div></Panel>
    </div>
    <Panel className="insight-panel"><span>✦</span><div><b>Insight operativo</b><p>Il picco di affluenza è previsto alle {peak.time} con {peak.value} coperti. Valuta di rinforzare sala e cucina.</p></div></Panel>
  </div>;
}

function Donut({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const percent = Math.round((value / max) * 100);
  return <div className="donut-item"><div className="donut" style={{ background: `conic-gradient(${color} ${percent}%, #202729 0)` }}><span><b>{value}/{max}</b><small>{percent}%</small></span></div><strong>{label}</strong></div>;
}
