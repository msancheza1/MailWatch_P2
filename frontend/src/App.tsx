import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { api } from "./api/axios";
import Dashboard from "./pages/Dashboard";

export interface SessionUser {
  email: string;
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);

  const [checking, setChecking] = useState(() =>
    Boolean(sessionStorage.getItem("mailwatch-token")),
  );

  const [isRegister, setIsRegister] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    function handleExpiredSession() {
      sessionStorage.removeItem("mailwatch-token");
      setUser(null);
      setError("Tu sesión expiró. Inicia sesión de nuevo.");
    }

    window.addEventListener("auth-expired", handleExpiredSession);

    if (sessionStorage.getItem("mailwatch-token")) {
      api
        .get<SessionUser>("/auth/me")
        .then(({ data }) => {
          if (active) {
            setUser(data);
          }
        })
        .catch(() => {
          if (active) {
            sessionStorage.removeItem("mailwatch-token");
          }
        })
        .finally(() => {
          if (active) {
            setChecking(false);
          }
        });
    }

    return () => {
      active = false;
      window.removeEventListener("auth-expired", handleExpiredSession);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    setError("");
    setNotice("");

    if (isRegister && password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);

    try {
      if (isRegister) {
        const { data } = await api.post("/auth/register", {
          email,
          password,
        });

        setRegisteredEmail(data.user.email);
        form.reset();
        setIsRegister(false);
        setShowPassword(false);
        setNotice("Cuenta creada correctamente. Ya puedes iniciar sesión.");
      } else {
        const { data } = await api.post("/auth/login", {
          email,
          password,
        });

        sessionStorage.setItem("mailwatch-token", data.token);
        setUser(data.user);
      }
    } catch (cause: unknown) {
      const status = (
        cause as {
          response?: {
            status?: number;
          };
        }
      ).response?.status;

      if (status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else if (status === 409) {
        setError("Este correo ya está registrado. Inicia sesión.");
      } else if (status === 400) {
        setError(
          "Revisa los datos. Para registrarte, utiliza un correo válido y una contraseña de entre 8 y 1024 caracteres.",
        );
      } else {
        setError(
          "No se pudo completar la solicitud. Comprueba la conexión e inténtalo de nuevo.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");

    try {
      await api.post("/auth/logout");

      sessionStorage.removeItem("mailwatch-token");
      setUser(null);
      setNotice("");
      setShowPassword(false);
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function changeForm() {
    setIsRegister((current) => !current);
    setShowPassword(false);
    setError("");
    setNotice("");
  }

  if (checking) {
    return (
      <main className="mw-loading" role="status">
        <ShieldCheck size={36} />
        <p>Comprobando sesión…</p>
      </main>
    );
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={() => void handleLogout()}
        loggingOut={busy}
        sessionError={error}
      />
    );
  }

  return (
    <main className="mw-auth">
      <section className="mw-auth-story" aria-label="Acerca de MailWatch">
        <div className="mw-brand">
          <span className="mw-logo">
            <ShieldCheck size={25} />
          </span>
          <span>MailWatch</span>
        </div>

        <div className="mw-auth-copy">
          <p className="mw-eyebrow">ANÁLISIS DE CORREOS</p>

          <h1>
            Más claridad.
            <br />
            <span>Menos dudas.</span>
          </h1>

          <p>
            Identifica señales de phishing y entiende por qué un correo
            puede representar un riesgo.
          </p>

          <div className="mw-auth-preview">
            <span className="mw-preview-icon">
              <Mail size={26} />
            </span>

            <div>
              <strong>Una revisión con contexto</strong>
              <p>
                Clasificación, indicadores y acciones recomendadas en un
                solo lugar.
              </p>
            </div>
          </div>
        </div>

        <p className="mw-auth-foot">
          MailWatch · Análisis y revisión de correos
        </p>
      </section>

      <section className="mw-auth-form-side">
        <form
          key={isRegister ? "register" : "login"}
          className="mw-auth-form"
          onSubmit={handleSubmit}
        >
          <span className="mw-form-icon">
            <LockKeyhole size={25} />
          </span>

          <p className="mw-eyebrow">TU ESPACIO DE ANÁLISIS</p>

          <h2>
            {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
          </h2>

          <p className="mw-muted">
            {isRegister
              ? "Regístrate para comenzar a utilizar MailWatch."
              : "Ingresa para consultar tus correos y análisis."}
          </p>

          <div className="mw-field">
            <label htmlFor="email">Correo electrónico</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              autoComplete={isRegister ? "email" : "username"}
              defaultValue={registeredEmail}
              maxLength={254}
              disabled={busy}
              required
            />
          </div>

          <div className="mw-field">
            <label htmlFor="password">Contraseña</label>

            <div className="mw-password">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  isRegister ? "new-password" : "current-password"
                }
                minLength={isRegister ? 8 : undefined}
                maxLength={1024}
                disabled={busy}
                required
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                disabled={busy}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="mw-field">
              <label htmlFor="confirmation">
                Confirmar contraseña
              </label>

              <input
                id="confirmation"
                name="confirmation"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={1024}
                disabled={busy}
                required
              />

              <small className="mw-muted">
                Utiliza entre 8 y 1024 caracteres.
              </small>
            </div>
          )}

          {notice && (
            <p className="mw-message mw-success" role="status">
              {notice}
            </p>
          )}

          {error && (
            <p className="mw-message mw-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mw-button mw-primary mw-full"
            disabled={busy}
          >
            {busy
              ? "Procesando…"
              : isRegister
                ? "Crear cuenta"
                : "Ingresar"}

            <ArrowRight size={18} />
          </button>

          <div className="mw-auth-switch">
            <span>
              {isRegister
                ? "¿Ya tienes cuenta?"
                : "¿Es tu primera vez?"}
            </span>

            <button
              type="button"
              onClick={changeForm}
              disabled={busy}
            >
              {isRegister ? "Inicia sesión" : "Crea una cuenta"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}