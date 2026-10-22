import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Dashboard from "./pages/Dashboard";
import { api } from "./api/axios";
function App() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [checking, setChecking] = useState(() =>
    Boolean(sessionStorage.getItem("mailwatch-token"))
  );
  const [isRegister, setIsRegister] = useState(false);
  const [notice, setNotice] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setError("Tu sesión expiró. Inicia sesión de nuevo.");
    };
    window.addEventListener("auth-expired", expired);
    if (sessionStorage.getItem("mailwatch-token")) {
      api
        .get("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => {
          sessionStorage.removeItem("mailwatch-token");
        })
        .finally(() => setChecking(false));
    }
    return () => window.removeEventListener("auth-expired", expired);
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await api.post("/auth/login", {
        email: data.get("email"),
        password: data.get("password"),
      });
      sessionStorage.setItem("mailwatch-token", response.data.token);
      setUser(response.data.user);
    } catch (error: unknown) {
      const status = (error as { response?: { status: number } }).response
        ?.status;
      setError(
        status === 401
          ? "Correo o contraseña incorrectos."
          : "No se pudo iniciar sesión. Comprueba la conexión e inténtalo de nuevo."
      );
    } finally {
      setBusy(false);
    }
  }
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("password") !== data.get("confirmation")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const { data: result } = await api.post("/auth/register", {
        email: data.get("email"),
        password: data.get("password"),
      });
      setRegisteredEmail(result.user.email);
      form.reset();
      setIsRegister(false);
      setNotice("Cuenta creada correctamente. Ya puedes iniciar sesión.");
    } catch (error: unknown) {
      const status = (error as { response?: { status: number } }).response
        ?.status;
      setError(
        status === 409
          ? "Este correo ya está registrado. Inicia sesión con tu cuenta."
          : status === 400
            ? "Ingresa un correo válido y una contraseña de entre 8 y 1024 caracteres."
            : "No se pudo crear la cuenta. Comprueba la conexión e inténtalo de nuevo."
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/logout");
      sessionStorage.removeItem("mailwatch-token");
      setUser(null);
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  if (checking) return <p role="status">Comprobando sesión…</p>;
  if (user)
    return (
      <>
        <div style={{ padding: 12, textAlign: "right" }}>
          {user.email}{" "}
          <button disabled={busy} onClick={logout}>
            Cerrar sesión
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
        <Dashboard />
      </>
    );
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <form
        key={isRegister ? "register" : "login"}
        onSubmit={isRegister ? register : login}
        style={{
          background: "white",
          padding: 36,
          borderRadius: 20,
          width: "min(420px, 92vw)",
          display: "grid",
          gap: 16,
        }}
      >
        <h1>MailWatch</h1>
        <h2>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h2>
        <p>
          {isRegister
            ? "Regístrate para utilizar MailWatch."
            : "Accede a tus análisis y configuraciones."}
        </p>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete={isRegister ? "email" : "username"}
          defaultValue={registeredEmail}
          disabled={busy}
          maxLength={254}
          required
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined}
          disabled={busy}
          maxLength={1024}
          required
        />
        {isRegister && (
          <>
            <p>Usa entre 8 y 1024 caracteres para tu contraseña.</p>
            <label htmlFor="confirmation">Confirmar contraseña</label>
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={1024}
              required
              disabled={busy}
            />
          </>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy
            ? isRegister
              ? "Creando cuenta…"
              : "Ingresando…"
            : isRegister
              ? "Crear cuenta"
              : "Ingresar"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
            setNotice("");
          }}
        >
          {isRegister
            ? "Ya tengo cuenta. Iniciar sesión"
            : "¿No tienes cuenta? Crear cuenta"}
        </button>
      </form>
    </main>
  );
}
export default App;
