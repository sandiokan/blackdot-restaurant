import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MailPlus, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { GhostButton, Panel, PrimaryButton, SectionTitle } from "@/components/shared/Primitives";
import { supabase } from "@/lib/supabase";
import type { RestaurantAccessInvite, RestaurantAccessRecord, RestaurantAccessRole } from "@/types/models";

type AccessPayload = {
  access: Array<{ id: string; user_id: string; email: string | null; role: RestaurantAccessRole; created_at: string }>;
  invitations: Array<{ id: string; email: string; role: Exclude<RestaurantAccessRole, "OWNER">; status: RestaurantAccessInvite["status"]; created_at: string; sent_at: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; invited_user_id: string | null }>;
};

function normalizePayload(payload: AccessPayload) {
  return {
    access: (payload.access ?? []).map((item): RestaurantAccessRecord => ({ id: item.id, userId: item.user_id, email: item.email, role: item.role, createdAt: item.created_at })),
    invitations: (payload.invitations ?? []).map((item): RestaurantAccessInvite => ({ id: item.id, email: item.email, role: item.role, status: item.status, createdAt: item.created_at, sentAt: item.sent_at, expiresAt: item.expires_at, acceptedAt: item.accepted_at, revokedAt: item.revoked_at, invitedUserId: item.invited_user_id })),
  };
}

function invitationLabel(status: RestaurantAccessInvite["status"]) {
  return { PENDING: "In attesa", ACCEPTED: "Accettato", REVOKED: "Revocato", EXPIRED: "Scaduto" }[status];
}

function invitationClass(status: RestaurantAccessInvite["status"]) {
  return `access-status ${status.toLowerCase()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

async function friendlyError(error: unknown) {
  const response = error && typeof error === "object" && "context" in error ? (error as { context?: unknown }).context : null;
  const payload = response instanceof Response ? await response.clone().json().catch(() => null) as { error?: string } | null : null;
  switch (payload?.error) {
    case "An active invitation already exists for this email.": return "Esiste già un invito attivo per questo indirizzo email.";
    case "This account already has restaurant access.": return "Questo account è già associato a un ristorante.";
    case "Invitation rate limit reached. Try again later.": return "Hai raggiunto il limite di inviti orari. Riprova più tardi.";
    case "Invitation redirect is not configured.": return "Il redirect degli inviti non è ancora configurato in Supabase.";
    case "Owner authorization required.": return "Solo il proprietario può gestire gli accessi.";
    default: {
      const message = error instanceof Error ? error.message : "";
      return /FunctionsHttpError|Failed to fetch|NetworkError|Failed to send/i.test(message)
        ? "Il servizio accessi non è configurato per questo dominio oppure non è raggiungibile."
        : "Operazione non completata. Riprova tra qualche istante.";
    }
  }
}

export default function AccessManagementPanel() {
  const [access, setAccess] = useState<RestaurantAccessRecord[]>([]);
  const [invitations, setInvitations] = useState<RestaurantAccessInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<RestaurantAccessRole, "OWNER">>("EMPLOYEE");
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const loadAccess = useCallback(async () => {
    if (!supabase) {
      setError("Configurazione Supabase non disponibile.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: functionError } = await supabase.functions.invoke<AccessPayload>("manage-restaurant-access", { body: { action: "list" } });
    if (functionError || !data) {
      setError(await friendlyError(functionError));
    } else {
      const payload = normalizePayload(data);
      setAccess(payload.access);
      setInvitations(payload.invitations);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadAccess(); }, [loadAccess]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSubmittingInvite(true);
    const { error: functionError } = await supabase.functions.invoke("manage-restaurant-access", {
      body: { action: "invite", email: email.trim().toLowerCase(), role: inviteRole },
    });
    setSubmittingInvite(false);
    if (functionError) {
      toast.error("Invito non inviato", { description: await friendlyError(functionError) });
      return;
    }
    setEmail("");
    setInviteOpen(false);
    toast.success("Invito inviato");
    void loadAccess();
  }

  async function handleRoleChange(item: RestaurantAccessRecord, role: Exclude<RestaurantAccessRole, "OWNER">) {
    if (!supabase || item.role === role) return;
    setWorkingId(item.id);
    const { error: functionError } = await supabase.functions.invoke("manage-restaurant-access", { body: { action: "change_role", accessId: item.id, role } });
    setWorkingId(null);
    if (functionError) {
      toast.error("Ruolo non aggiornato", { description: await friendlyError(functionError) });
      return;
    }
    setAccess((current) => current.map((accessItem) => accessItem.id === item.id ? { ...accessItem, role } : accessItem));
    toast.success("Ruolo aggiornato");
  }

  async function handleRevoke(item: RestaurantAccessRecord) {
    if (!supabase || !window.confirm(`Revocare l'accesso di ${item.email ?? "questo utente"}?`)) return;
    setWorkingId(item.id);
    const { error: functionError } = await supabase.functions.invoke("manage-restaurant-access", { body: { action: "revoke", accessId: item.id } });
    setWorkingId(null);
    if (functionError) {
      toast.error("Revoca non completata", { description: await friendlyError(functionError) });
      return;
    }
    setAccess((current) => current.filter((accessItem) => accessItem.id !== item.id));
    toast.success("Accesso revocato");
    void loadAccess();
  }

  return <div className="access-management">
    <div className="access-management-head">
      <div><h2>Utenti e accessi</h2><p>Gestisci gli accessi al tuo ristorante. Solo il proprietario può modificare questi permessi.</p></div>
      <PrimaryButton onClick={() => setInviteOpen(true)}><MailPlus size={17} />Invita utente</PrimaryButton>
    </div>

    <Panel className="access-panel">
      <SectionTitle action={<button onClick={() => void loadAccess()} aria-label="Aggiorna accessi" disabled={loading}><RefreshCw size={14} className={loading ? "spin-icon" : ""} /></button>}>Utenti autorizzati</SectionTitle>
      {loading ? <p className="access-message">Caricamento accessi...</p> : error ? <div className="access-error"><span>{error}</span><GhostButton onClick={() => void loadAccess()}>Riprova</GhostButton></div> : access.length === 0 ? <p className="access-message">Nessun utente autorizzato.</p> : <div className="access-list">{access.map((item) => <div className="access-row" key={item.id}>
        <span className="access-avatar"><Users size={15} /></span>
        <div className="access-person"><b>{item.email ?? "Utente autorizzato"}</b><small>Accesso attivo dal {formatDate(item.createdAt)}</small></div>
        {item.role === "OWNER" ? <span className="access-role owner"><ShieldCheck size={13} />Proprietario</span> : <select aria-label={`Ruolo di ${item.email ?? "utente"}`} value={item.role} disabled={workingId === item.id} onChange={(event) => void handleRoleChange(item, event.target.value as Exclude<RestaurantAccessRole, "OWNER">)}><option value="MANAGER">Manager</option><option value="EMPLOYEE">Dipendente</option></select>}
        {item.role !== "OWNER" && <button className="access-revoke" onClick={() => void handleRevoke(item)} disabled={workingId === item.id} aria-label={`Revoca accesso a ${item.email ?? "utente"}`}><Trash2 size={16} /></button>}
      </div>)}</div>}
    </Panel>

    <Panel className="access-panel">
      <SectionTitle>Inviti</SectionTitle>
      {loading ? <p className="access-message">Caricamento inviti...</p> : error ? <p className="access-message">Gli inviti saranno disponibili al ripristino della connessione.</p> : invitations.length === 0 ? <p className="access-message">Nessun invito inviato.</p> : <div className="access-list">{invitations.map((invite) => <div className="access-row invitation-row" key={invite.id}>
        <span className="access-avatar pending"><MailPlus size={15} /></span>
        <div className="access-person"><b>{invite.email}</b><small>Inviato il {formatDate(invite.sentAt)} · {invite.role === "MANAGER" ? "Manager" : "Dipendente"}</small></div>
        <span className={invitationClass(invite.status)}>{invitationLabel(invite.status)}</span>
      </div>)}</div>}
    </Panel>

    {inviteOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={() => !submittingInvite && setInviteOpen(false)}><section className="reservation-dialog access-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-head"><div><h2 id="invite-title">Invita utente</h2><p>Invia un accesso come Manager o Dipendente.</p></div><button onClick={() => setInviteOpen(false)} aria-label="Chiudi">×</button></div>
      <form className="access-invite-form" onSubmit={handleInvite}>
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@azienda.it" autoComplete="email" required disabled={submittingInvite} /></label>
        <label className="field"><span>Ruolo</span><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<RestaurantAccessRole, "OWNER">)} disabled={submittingInvite}><option value="EMPLOYEE">Dipendente — sola lettura</option><option value="MANAGER">Manager — gestione operativa</option></select></label>
        <div className="access-dialog-actions"><GhostButton onClick={() => setInviteOpen(false)}>Annulla</GhostButton><PrimaryButton type="submit" disabled={submittingInvite}>{submittingInvite ? "Invio..." : "Invia invito"}</PrimaryButton></div>
      </form>
    </section></div>}
  </div>;
}
