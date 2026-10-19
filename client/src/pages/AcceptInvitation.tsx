import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, MailWarning, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

function invitationIdFromUrl() {
  const value = new URLSearchParams(window.location.search).get("invitation");
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function invitationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/FunctionsHttpError|Failed to fetch|NetworkError/i.test(message)) return "Non riusciamo a verificare l'invito in questo momento. Riprova più tardi.";
  return "L'invito non è valido, è scaduto oppure è stato revocato.";
}

export default function AcceptInvitation() {
  const [, navigate] = useLocation();
  const { loading, user, refreshAccess } = useAuth();
  const invitationId = useMemo(invitationIdFromUrl, []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const requiresPassword = Boolean(user?.user_metadata?.requires_password_setup);

  useEffect(() => {
    if (!loading && !invitationId) setError("Il link di invito non è valido.");
  }, [invitationId, loading]);

  async function activate() {
    if (!supabase || !invitationId) return;
    const { error: functionError } = await supabase.functions.invoke("manage-restaurant-access", { body: { action: "accept_invitation", invitationId } });
    if (functionError) throw functionError;
    await refreshAccess();
    setDone(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !supabase || !invitationId) return;
    if (requiresPassword && (password.length < 8 || password !== confirmation)) {
      setError(password.length < 8 ? "La password deve contenere almeno 8 caratteri." : "Le password non coincidono.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (requiresPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password, data: { requires_password_setup: false } });
        if (passwordError) throw passwordError;
      }
      await activate();
    } catch (caught) {
      setError(invitationError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="auth-loading">Verifica invito...</main>;
  if (done) return <main className="auth-screen"><section className="auth-panel access-panel accept-success"><ShieldCheck className="access-icon" size={25} /><div className="auth-copy"><p>Accesso attivato</p><h1>Benvenuto.</h1><span>Il tuo accesso al ristorante è stato configurato.</span></div><button className="auth-submit" onClick={() => navigate("/", { replace: true })}>Apri il gestionale</button></section></main>;
  if (!invitationId) return <InvitationNotice title="Link non valido" description="Apri il link completo ricevuto via email oppure chiedi al proprietario di inviarti un nuovo invito." icon={<MailWarning size={25} />} />;
  if (!user) return <InvitationNotice title="Verifica la tua email" description="Per attivare l’accesso, apri il link ricevuto nell’email di invito. Il link ti autentica automaticamente e ti riporta qui." icon={<MailWarning size={25} />} />;

  return <main className="auth-screen"><section className="auth-panel access-panel accept-invitation" aria-labelledby="accept-title">
    <div className="auth-brand"><span>BLACKDOT</span><small>RESTAURANT</small></div>
    <div className="auth-copy"><p>Invito al gestionale</p><h1 id="accept-title">{requiresPassword ? "Crea la password." : "Attiva l’accesso."}</h1><span>{requiresPassword ? "Scegli una password per il tuo nuovo account." : `Conferma l’accesso come ${user.email ?? "utente"}.`}</span></div>
    <form className="auth-form" onSubmit={handleSubmit}>
      {requiresPassword && <><label><span>Nuova password</span><div className="auth-input"><KeyRound size={17} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={submitting} /></div></label><label><span>Conferma password</span><div className="auth-input"><KeyRound size={17} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={submitting} /><button type="button" aria-label={showPassword ? "Nascondi password" : "Mostra password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label></>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Attivazione..." : "Attiva accesso"}</button>
    </form>
  </section></main>;
}

function InvitationNotice({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return <main className="auth-screen"><section className="auth-panel access-panel"><span className="access-icon">{icon}</span><div className="auth-copy"><p>Accesso su invito</p><h1>{title}</h1><span>{description}</span></div></section></main>;
}
