import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell, CalendarDays, ChartNoAxesColumnIncreasing, ChefHat, ChevronDown,
  Clock3, HelpCircle, Home, Menu, Search, Settings, Users, X, ClipboardList, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/prenotazioni", label: "Prenotazioni", icon: CalendarDays },
  { href: "/calendario", label: "Calendario", icon: ClipboardList },
  { href: "/affluenza", label: "Affluenza", icon: ChartNoAxesColumnIncreasing },
  { href: "/personale", label: "Personale", icon: Users },
  { href: "/turni", label: "Turni", icon: Clock3 },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const { restaurant, loading, error, reloadData } = useAppData();
  const active = (href: string) => href === "/" ? location === "/" : location.startsWith(href);
  const [restaurantLead, ...restaurantTail] = (restaurant?.name ?? "Ristorante").split(" ");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>BLACKDOT</span><small>RESTAURANT</small></div>
        <button className="restaurant-switcher"><ChefHat size={22} /><span><b>{restaurantLead}</b><small>{restaurantTail.join(" ") || "BLACKDOT"}</small></span><ChevronDown size={16} /></button>
        <nav className="side-nav">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("side-nav-link", active(href) && "active")}>
              <Icon size={20} strokeWidth={1.7} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-help"><HelpCircle size={20} /><span><b>Hai bisogno di aiuto?</b><small>Contatta il supporto</small></span></div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu-trigger" aria-label="Apri menu" onClick={() => setMobileMenu(true)}><Menu size={23} /></button>
          <label className="global-search"><Search size={19} /><input aria-label="Ricerca globale" placeholder="Cerca prenotazioni, clienti, telefono..." /></label>
          <div className="topbar-actions">
            <button className="notification" aria-label="Notifiche"><Bell size={21} /><span /></button>
            <div className="user-profile"><span className="user-avatar">LR</span><span><b>Ludovico Rossi</b><small>Proprietario</small></span><ChevronDown size={15} /></div>
          </div>
        </header>
        <main className="content">
          {loading && <div className="data-state loading"><RefreshCw size={15} />Caricamento dati...</div>}
          {error && <div className="data-state error"><span>{error}</span><button onClick={() => void reloadData()}>Riprova</button></div>}
          {children}
        </main>
      </div>

      <nav className="mobile-bottom-nav">
        {navItems.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn(active(href) && "active")}><Icon size={19} /><small>{label}</small></Link>
        ))}
        <button onClick={() => setMobileMenu(true)}><Menu size={19} /><small>Altro</small></button>
      </nav>

      {mobileMenu && (
        <div className="mobile-menu-backdrop" onClick={() => setMobileMenu(false)}>
          <div className="mobile-menu-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-head"><div className="brand"><span>BLACKDOT</span><small>RESTAURANT</small></div><button onClick={() => setMobileMenu(false)}><X /></button></div>
            <nav className="mobile-menu-list">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileMenu(false)} className={cn(active(href) && "active")}><Icon size={20} />{label}</Link>
              ))}
              <Link href="/onboarding" onClick={() => setMobileMenu(false)}><ChefHat size={20} />Configura ristorante</Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
