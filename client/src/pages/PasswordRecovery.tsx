import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, MailWarning } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

function recoveryErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/password should be at least|weak password/i.test(message)) return "La password deve contenere almeno 8 caratteri e rispettare i requisiti di sicurezza.";
  if (/jwt|expired|session/i.test(message)) return "La sessione di recupero è scaduta. Richiedi un nuovo link per reimpostare la password.";
  return "Non è stato possibile aggiornare la password. Riprova usando il link ricevuto via email.";
}

export default function PasswordRecovery() {
  const [, navigate] = useLocation();
  const { loading, user, passwordRecoveryActive, passwordRecoveryError, refreshAccess, completePasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordRecoveryActive || !user || !supabase) return;
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== confirmation) {
      setError("Le password non coincidono.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await refreshAccess();
      completePasswordRecovery();
      setDone(true);
    } catch (caught) {
      setError(recoveryErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="auth-loading">Verifica il link di recupero...</main>;

  if (done) return <main className="auth-screen"><section className="auth-panel access-panel accept-success"><CheckCircle2 className="access-icon" size={25} /><div className="auth-copy"><p>Password aggiornata</p><h1>Tutto pronto.</h1><span>Ora puoi accedere normalmente alla tua area autorizzata.</span></div><button className="auth-submit" onClick={() => navigate("/", { replace: true })}>Continua</button></section></main>;

  if (!passwordRecoveryActive || !user) return <main className="auth-screen"><section className="auth-panel access-panel"><MailWarning className="access-icon" size={25} /><div className="auth-copy"><p>Recupero password</p><h1>Link non valido.</h1><span>{passwordRecoveryError ?? "Il link di recupero non è valido o la sessione è scaduta. Richiedi un nuovo link da Supabase Authentication."}</span></div></section></main>;

  return <main className="auth-screen"><section className="auth-panel access-panel" aria-labelledby="recovery-title">
    <div className="auth-brand"><span>BLACKDOT</span><small>RESTAURANT</small></div>
    <div className="auth-copy"><p>Recupero password</p><h1 id="recovery-title">Imposta una nuova password.</h1><span>Stai aggiornando la password dell’account {user.email ?? "autenticato"}.</span></div>
    <form className="auth-form" onSubmit={handleSubmit}>
      <label><span>Nuova password</span><div className="auth-input"><KeyRound size={17} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={submitting} /></div></label>
      <label><span>Conferma password</span><div className="auth-input"><KeyRound size={17} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={submitting} /><button type="button" aria-label={showPassword ? "Nascondi password" : "Mostra password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Aggiornamento..." : "Aggiorna password"}</button>
    </form>
  </section></main>;
}
