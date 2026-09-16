import type { ElementType, ReactNode } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import type { ReservationStatus } from "@/types/models";
import { cn } from "@/lib/utils";

export function Panel({ children, className = "", interactive = false }: { children: ReactNode; className?: string; interactive?: boolean }) {
  return <section className={cn("panel", interactive && "panel-interactive", className)}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ children, onClick, type = "button", className = "", disabled = false }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; className?: string; disabled?: boolean }) {
  return <button type={type} className={cn("button-primary", className)} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function GhostButton({ children, onClick, className = "", type = "button" }: { children: ReactNode; onClick?: () => void; className?: string; type?: "button" | "submit" }) {
  return <button type={type} className={cn("button-ghost", className)} onClick={onClick}>{children}</button>;
}

export function StatCard({ icon: Icon, value, label, foot, tone = "neutral", showArrow = true }: { icon: ElementType; value: string | number; label: string; foot?: string; tone?: "neutral" | "green" | "gold" | "red"; showArrow?: boolean }) {
  return (
    <Panel className="stat-card">
      <div className={cn("stat-icon", `tone-${tone}`)}><Icon size={21} strokeWidth={1.8} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {foot && <div className={cn("stat-foot", `text-${tone}`)}>{foot}</div>}
      </div>
      {showArrow && <ChevronRight className="stat-arrow" size={16} />}
    </Panel>
  );
}

const statusLabels: Record<ReservationStatus, string> = {
  confirmed: "Confermata",
  pending: "In attesa",
  cancelled: "Cancellata",
  completed: "Completata",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <span className={cn("status-badge", `status-${status}`)}><span className="status-dot" />{statusLabels[status]}</span>;
}

export function ServiceProgress({ label, used, total = 80, compact = false }: { label: string; used: number; total?: number; compact?: boolean }) {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const tone = percent >= 85 ? "red" : percent >= 65 ? "gold" : "green";
  return (
    <div className={cn("service-progress", compact && "compact")}>
      <div className="service-progress-head"><span>{label}</span><strong>{used} / {total}</strong></div>
      <div className="progress-track"><span className={`progress-${tone}`} style={{ width: `${percent}%` }} /></div>
      <div className="service-progress-foot"><span className={`text-${tone}`}>{percent >= 85 ? "Quasi pieno" : percent >= 65 ? "Disponibilità limitata" : "Disponibilità buona"}</span><b>{percent}%</b></div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="section-title"><h2>{children}</h2>{action}</div>;
}

export function Segmented<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="segmented">
      {options.map((option) => <button key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>)}
    </div>
  );
}

export function AccentLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button className="accent-link" onClick={onClick}>{children}<ArrowUpRight size={14} /></button>;
}

export function Avatar({ initials, color = "#c99468", size = "md" }: { initials: string; color?: string; size?: "sm" | "md" | "lg" }) {
  return <span className={cn("avatar", `avatar-${size}`)} style={{ background: `linear-gradient(145deg, ${color}, #252b2d)` }}>{initials}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><span>·</span><strong>{title}</strong><p>{description}</p></div>;
}
