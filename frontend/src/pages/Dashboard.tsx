import { useCallback, useEffect, useState } from "react";

import {
  ArrowDownRight,
  Inbox,
  Mail,
  ShieldAlert,
} from "lucide-react";

import type { SessionUser } from "../App";
import { api } from "../api/axios";

import Sidebar from "../components/Sidebar";
import EmailWorkbench from "../components/EmailWorkbench";
import ModelMetrics from "../components/ModelMetrics";
import Sensibilidad from "../components/Sensibilidad";

interface Stats {
  emailsAnalyzed: number;
  threatsBlocked: number;
  quarantine: number;
  protectionLevel: string;
}

interface DashboardProps {
  user: SessionUser;
  onLogout: () => void;
  loggingOut: boolean;
  sessionError: string;
}

export default function Dashboard({
  user,
  onLogout,
  loggingOut,
  sessionError,
}: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [metricsVersion, setMetricsVersion] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday(new Date());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const { data } = await api.get<Stats>("/dashboard/stats");

      setStats(data);
      setStatsError("");
    } catch {
      setStatsError(
        "No se pudo actualizar el resumen. Los valores anteriores pueden estar desactualizados.",
      );
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const handleEmailChange = useCallback(async () => {
    setMetricsVersion((current) => current + 1);
    await refreshStats();
  }, [refreshStats]);

  const date = today.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cards = [
    {
      label: "Correos analizados",
      value: stats?.emailsAnalyzed,
      detail: "Correos distintos con un análisis",
      icon: Mail,
      tone: "blue",
    },
    {
      label: "Análisis de riesgo alto",
      value: stats?.threatsBlocked,
      detail: "Incluye los análisis repetidos",
      icon: ShieldAlert,
      tone: "red",
    },
    {
      label: "En cuarentena",
      value: stats?.quarantine,
      detail: "Registros de aislamiento simulado",
      icon: Inbox,
      tone: "amber",
    },
  ];

  return (
    <div className="mw-app">
      <a className="mw-skip" href="#contenido">
        Saltar al contenido
      </a>

      <Sidebar
        email={user.email}
        onLogout={onLogout}
        loggingOut={loggingOut}
        showMetrics={showMetrics}
      />

      <main id="contenido" className="mw-main">
        <header className="mw-topbar">
          <span>Panel de análisis</span>

          <span className="mw-user-chip" title={user.email}>
            <span className="mw-status-dot" />
            {user.email}
          </span>
        </header>

        {sessionError && (
          <p className="mw-message mw-error" role="alert">
            {sessionError}
          </p>
        )}

        <section id="resumen" className="mw-hero">
          <div>
            <p className="mw-eyebrow mw-date">{date}</p>

            <h1>
              Tu correo, bajo una
              <br className="mw-desktop-break" />
              mirada más clara.
            </h1>

            <p>
              Revisa los análisis, consulta las señales de riesgo y
              gestiona la cuarentena simulada.
            </p>

            <a
              className="mw-button mw-hero-button"
              href="#correos"
            >
              Revisar correos
              <ArrowDownRight size={18} />
            </a>
          </div>

          <div className="mw-hero-art" aria-hidden="true">
            <div className="mw-orbit" />

            <Mail size={80} strokeWidth={1.2} />

            <span>
              <ShieldAlert size={26} />
            </span>
          </div>
        </section>

        {statsError && (
          <div className="mw-message mw-error" role="alert">
            <span>{statsError}</span>

            <button
              type="button"
              className="mw-text-button"
              onClick={() => void refreshStats()}
            >
              Reintentar
            </button>
          </div>
        )}

        <section
          className="mw-stats"
          aria-label="Resumen de actividad"
        >
          {cards.map(
            ({ label, value, detail, icon: Icon, tone }) => (
              <article className="mw-stat" key={label}>
                <div className="mw-stat-heading">
                  <h2>{label}</h2>

                  <span
                    className={`mw-stat-icon mw-${tone}`}
                  >
                    <Icon size={21} />
                  </span>
                </div>

                <strong>
                  {value === undefined
                    ? "—"
                    : value.toLocaleString("es-CO")}
                </strong>

                <p>{detail}</p>
              </article>
            ),
          )}
        </section>

        <ModelMetrics
          refreshKey={metricsVersion}
          onAccessChange={setShowMetrics}
        />

        <EmailWorkbench onChange={handleEmailChange} />

        <div className="mw-config">
          <Sensibilidad />
        </div>

        <footer className="mw-footer">
          MailWatch · La cuarentena es simulada y no modifica tu
          bandeja de Gmail.
        </footer>
      </main>
    </div>
  );
}