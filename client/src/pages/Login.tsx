import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="auth">
      <section className="auth-hero" aria-hidden="true">
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 32 32">
              <path d="M9 21.5 14 16l3.5 3.5L23 12" />
            </svg>
          </span>
          <span className="brand-name">Cuentas Claras</span>
        </div>
        <div>
          <h1>Tu dinero, en orden y a la vista.</h1>
          <p>Registra ingresos y gastos, fija presupuestos por categoría y entiende a dónde va cada dólar.</p>
        </div>
        <div className="hero-card">
          <span>Balance de este mes</span>
          <strong>$ 1.284,50</strong>
          <div className="hero-bars">
            {[38, 54, 46, 70, 62, 84].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="form auth-form" onSubmit={submit}>
          <h2>{isLogin ? "Inicia sesión" : "Crea tu cuenta"}</h2>
          <p className="muted">
            {isLogin ? "Bienvenido de nuevo." : "Empieza gratis, solo necesitas un correo."}
          </p>

          {!isLogin && (
            <label className="field">
              <span>Nombre</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="field">
            <span>Correo</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={isLogin ? undefined : 8}
              required
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="button primary block" disabled={busy}>
            {busy ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}
          </button>

          <p className="switch">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              className="link"
              onClick={() => {
                setMode(isLogin ? "register" : "login");
                setError("");
              }}
            >
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>

          {isLogin && (
            <p className="demo-hint">
              ¿Solo quieres verla? Usa <code>demo@finanzas.app</code> / <code>demo12345</code>
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
