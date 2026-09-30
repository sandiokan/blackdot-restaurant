import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate("/", { replace: true });
    } catch {
      setError("Email o password non validi. Controlla le credenziali e riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-screen">
    <section className="auth-panel" aria-labelledby="login-title">
      <div className="auth-brand"><span>BLACKDOT</span><small>RESTAURANT</small></div>
      <div className="auth-copy"><p>Accesso riservato</p><h1 id="login-title">Bentornato.</h1><span>Accedi al gestionale del tuo ristorante.</span></div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email</span>
          <div className="auth-input"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={submitting} /></div>
        </label>
        <label>
          <span>Password</span>
          <div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={submitting} /><button type="button" aria-label={showPassword ? "Nascondi password" : "Mostra password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Accesso in corso..." : "Accedi"}</button>
      </form>
    </section>
  </main>;
}
