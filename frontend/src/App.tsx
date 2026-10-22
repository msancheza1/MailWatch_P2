import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Dashboard from './pages/Dashboard';
import { api } from './api/axios';
function App() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setError('Tu sesión expiró. Inicia sesión de nuevo.');
    };
    window.addEventListener('auth-expired', expired);
    if (sessionStorage.getItem('mailwatch-token')) {
      api
        .get('/auth/me')
        .then((r) => setUser(r.data))
        .catch(() => {
          sessionStorage.removeItem('mailwatch-token');
        })
        .finally(() => setChecking(false));
    } else setChecking(false);
    return () => window.removeEventListener('auth-expired', expired);
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await api.post('/auth/login', {
        email: data.get('email'),
        password: data.get('password'),
      });
      sessionStorage.setItem('mailwatch-token', response.data.token);
      setUser(response.data.user);
    } catch (error: unknown) {
      const status = (error as { response?: { status: number } }).response
        ?.status;
      setError(
        status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Comprueba la conexión e inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/logout');
      sessionStorage.removeItem('mailwatch-token');
      setUser(null);
    } catch {
      setError('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  if (checking) return <p role="status">Comprobando sesión…</p>;
  if (user)
    return (
      <>
        <div style={{ padding: 12, textAlign: 'right' }}>
          {user.email}{' '}
          <button disabled={busy} onClick={logout}>
            Cerrar sesión
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
        <Dashboard />
      </>
    );
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form
        onSubmit={login}
        style={{
          background: 'white',
          padding: 36,
          borderRadius: 20,
          width: 'min(420px, 92vw)',
          display: 'grid',
          gap: 16,
        }}
      >
        <h1>MailWatch</h1>
        <h2>Iniciar sesión</h2>
        <p>Accede a tus análisis y configuraciones.</p>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
export default App;
