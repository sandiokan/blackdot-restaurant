import { LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AccessNotConfigured() {
  const { accessError, signOut } = useAuth();

  return <main className="auth-screen">
    <section className="auth-panel access-panel">
      <div className="auth-brand"><span>BLACKDOT</span><small>RESTAURANT</small></div>
      <div className="access-icon"><ShieldAlert size={25} /></div>
      <div className="auth-copy"><p>Accesso non configurato</p><h1>Account non autorizzato.</h1><span>{accessError ?? "Il tuo account non può accedere al gestionale."}</span></div>
      <button className="auth-submit access-logout" onClick={() => void signOut()}><LogOut size={16} />Esci</button>
    </section>
  </main>;
}
