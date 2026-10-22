import { useEffect, useRef, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  Upload,
} from "lucide-react";

import { api } from "../api/axios";

import FeedbackButtons from "./FeedbackButtons";
import type { Feedback } from "./FeedbackButtons";

import RiskBadge from "./RiskBadge";

import AlertaRiesgo from "./AlertaRiesgo";
import type { ResultadoAnalisis } from "./AlertaRiesgo";

import {
  traducirIndicador,
  traducirMotivo,
} from "../lib/textos";

type Email = {
  id: number;
  sender: string;
  subject: string;
  risk_level?: string;
};

type IsolatedEmail = Email & {
  reason: string;
  indicators: string[];
  quarantined_at: string;
};

type RiskFilter = "ALL" | "PENDING" | "LOW" | "MEDIUM" | "HIGH";

interface EmailWorkbenchProps {
  onChange: () => Promise<void>;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 5;

function Pagination({
  page,
  totalPages,
  totalItems,
  disabled,
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="mw-pagination">
      <p>
        Mostrando {first}–{last} de {totalItems}
      </p>

      <div>
        <button
          type="button"
          className="mw-page-button"
          aria-label="Página anterior"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>

        <span>
          {page} / {totalPages}
        </span>

        <button
          type="button"
          className="mw-page-button"
          aria-label="Página siguiente"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default function EmailWorkbench({
  onChange,
}: EmailWorkbenchProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [quarantine, setQuarantine] = useState<IsolatedEmail[]>([]);

  const [feedback, setFeedback] = useState<
    Record<number, Feedback>
  >({});

  const [categories, setCategories] = useState<
    Record<number, string>
  >({});

  const [lastAnalysis, setLastAnalysis] =
    useState<ResultadoAnalisis | null>(null);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [quarantineSearch, setQuarantineSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");

  const [emailPage, setEmailPage] = useState(1);
  const [quarantinePage, setQuarantinePage] = useState(1);

  // Evita iniciar dos operaciones antes del siguiente render.
  const operationInProgress = useRef(false);

  function applyFeedback(items: Feedback[]) {
    setFeedback(
      Object.fromEntries(
        items.map((item) => [item.email_id, item]),
      ),
    );
  }

  async function refresh() {
    const [available, isolated, reports] = await Promise.all([
      api.get<Email[]>("/emails"),
      api.get<IsolatedEmail[]>("/quarantine"),
      api.get<Feedback[]>("/feedback"),
    ]);

    setEmails(available.data);
    setQuarantine(isolated.data);
    applyFeedback(reports.data);
    setLoaded(true);
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get<Email[]>("/emails"),
      api.get<IsolatedEmail[]>("/quarantine"),
      api.get<Feedback[]>("/feedback"),
    ])
      .then(([available, isolated, reports]) => {
        if (!active) {
          return;
        }

        setEmails(available.data);
        setQuarantine(isolated.data);
        applyFeedback(reports.data);
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setError(
            "No se pudieron cargar los correos. Comprueba el servidor y pulsa Actualizar.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function run(action?: () => Promise<string>) {
    if (operationInProgress.current) {
      return;
    }

    operationInProgress.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (action) {
        try {
          const result = await action();
          setMessage(result);
        } catch {
          setError(
            "No se pudo confirmar la operación. Pulsa Actualizar antes de reintentar.",
          );
          return;
        }
      }

      try {
        await refresh();
        await onChange();

        if (!action) {
          setMessage("Lista actualizada.");
        }
      } catch {
        setError(
          action
            ? "La operación se completó, pero no se pudo actualizar la vista. Pulsa Actualizar; no repitas la operación."
            : "No se pudo actualizar la lista. Comprueba la conexión e inténtalo de nuevo.",
        );
      }
    } finally {
      operationInProgress.current = false;
      setBusy(false);
    }
  }

  function report(
    emailId: number,
    category: Feedback["category"],
  ) {
    void run(async () => {
      await api.post(`/feedback/${emailId}`, { category });

      return `Valoración guardada: correo #${emailId} marcado como ${
        category === "Safe" ? "seguro" : "peligroso"
      }.`;
    });
  }

  function getRisk(email: Email) {
    const category = categories[email.id];

    if (category === "Malicious") {
      return "HIGH";
    }

    if (category === "Suspicious") {
      return "MEDIUM";
    }

    if (category === "Safe") {
      return "LOW";
    }

    return email.risk_level;
  }

  function getCategory(email: Email) {
    const risk = getRisk(email);

    if (risk === "HIGH") {
      return "Malicious";
    }

    if (risk === "MEDIUM") {
      return "Suspicious";
    }

    if (risk === "LOW") {
      return "Safe";
    }

    return undefined;
  }

  function renderFeedback(email: Email, isolated = false) {
    return (
      <FeedbackButtons
        emailId={email.id}
        feedback={feedback[email.id]}
        disabled={busy || loading}
        analyzed={isolated || Boolean(getRisk(email))}
        onReport={report}
      />
    );
  }

  function matchesSearch(email: Email, query: string) {
    const text =
      `${email.id} ${email.subject} ${email.sender}`.toLocaleLowerCase(
        "es-CO",
      );

    return text.includes(query.trim().toLocaleLowerCase("es-CO"));
  }

  const filteredEmails = emails.filter((email) => {
    if (!matchesSearch(email, search)) {
      return false;
    }

    const risk = getRisk(email);

    if (riskFilter === "ALL") {
      return true;
    }

    if (riskFilter === "PENDING") {
      return !risk;
    }

    return risk === riskFilter;
  });

  const filteredQuarantine = quarantine.filter((email) =>
    matchesSearch(email, quarantineSearch),
  );

  const emailTotalPages = Math.max(
    1,
    Math.ceil(filteredEmails.length / PAGE_SIZE),
  );

  const quarantineTotalPages = Math.max(
    1,
    Math.ceil(filteredQuarantine.length / PAGE_SIZE),
  );

  const currentEmailPage = Math.min(emailPage, emailTotalPages);

  const currentQuarantinePage = Math.min(
    quarantinePage,
    quarantineTotalPages,
  );

  const visibleEmails = filteredEmails.slice(
    (currentEmailPage - 1) * PAGE_SIZE,
    currentEmailPage * PAGE_SIZE,
  );

  const visibleQuarantine = filteredQuarantine.slice(
    (currentQuarantinePage - 1) * PAGE_SIZE,
    currentQuarantinePage * PAGE_SIZE,
  );

  return (
    <div className="mw-workbench">
      <section
        id="correos"
        className="mw-panel"
        aria-labelledby="emails-title"
        aria-busy={loading || busy}
      >
        <div className="mw-section-heading">
          <div>
            <p className="mw-eyebrow">
              <Mail size={15} />
              BANDEJA DE ANÁLISIS
            </p>

            <h2 id="emails-title">
              Correos disponibles
              <span className="mw-count">
                {loaded ? emails.length : "—"}
              </span>
            </h2>

            <p className="mw-muted">
              Selecciona un correo para consultar su clasificación.
            </p>
          </div>

          <div className="mw-actions">
            <button
              type="button"
              className="mw-button mw-secondary"
              disabled={busy || loading}
              onClick={() => void run()}
            >
              <RefreshCw size={16} />
              Actualizar
            </button>

            <button
              type="button"
              className="mw-button mw-primary"
              disabled={busy || loading}
              onClick={() =>
                void run(async () => {
                  const { data } = await api.post("/emails/upload");

                  return `${data.inserted} correos de prueba cargados.`;
                })
              }
            >
              <Upload size={16} />
              Cargar dataset de prueba
            </button>
          </div>
        </div>

        <p className="mw-help">
          Cada carga agrega una copia del dataset de prueba.
        </p>

        <div className="mw-toolbar">
          <div className="mw-search">
            <Search size={18} aria-hidden="true" />

            <input
              type="search"
              aria-label="Buscar correos disponibles"
              placeholder="Buscar asunto, remitente o ID…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setEmailPage(1);
              }}
            />
          </div>

          <select
            className="mw-select"
            aria-label="Filtrar por clasificación"
            value={riskFilter}
            onChange={(event) => {
              setRiskFilter(event.target.value as RiskFilter);
              setEmailPage(1);
            }}
          >
            <option value="ALL">Todas las clasificaciones</option>
            <option value="PENDING">Sin analizar</option>
            <option value="LOW">Seguro</option>
            <option value="MEDIUM">Sospechoso</option>
            <option value="HIGH">Malicioso</option>
          </select>
        </div>

        {busy && (
          <p className="mw-processing" role="status">
            Procesando solicitud…
          </p>
        )}

        {error && (
          <p className="mw-message mw-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="mw-message mw-success" role="status">
            {message}
          </p>
        )}

        {lastAnalysis && (
          <div className="mw-analysis-result">
            <AlertaRiesgo
              resultado={lastAnalysis}
              onCerrar={() => setLastAnalysis(null)}
            />
          </div>
        )}

        {loading ? (
          <p className="mw-empty" role="status">
            Cargando correos…
          </p>
        ) : !loaded ? (
          <div className="mw-empty">
            <Inbox size={32} />
            <h3>La lista no está disponible</h3>
            <p>Pulsa Actualizar para volver a cargarla.</p>
          </div>
        ) : visibleEmails.length === 0 ? (
          <div className="mw-empty">
            <Inbox size={32} />

            <h3>
              {emails.length === 0
                ? "Tu bandeja está vacía"
                : "No encontramos coincidencias"}
            </h3>

            <p>
              {emails.length === 0
                ? "Carga el dataset de prueba para comenzar."
                : "Prueba con otra búsqueda o clasificación."}
            </p>
          </div>
        ) : (
          <>
            <ul className="mw-email-list">
              {visibleEmails.map((email) => (
                <li className="mw-email-row" key={email.id}>
                  <div className="mw-email-main">
                    <span className="mw-email-icon">
                      <Mail size={21} />
                    </span>

                    <div className="mw-email-info">
                      <h3>{email.subject || "Sin asunto"}</h3>

                      <p>
                        #{email.id} · {email.sender}
                      </p>

                      <div className="mw-email-badge">
                        <RiskBadge category={getCategory(email)} />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mw-button mw-analyze"
                      disabled={busy || loading}
                      onClick={() =>
                        void run(async () => {
                          const { data } =
                            await api.post<ResultadoAnalisis>(
                              `/analysis/${email.id}`,
                            );

                          setCategories((current) => ({
                            ...current,
                            [email.id]: data.category,
                          }));

                          setLastAnalysis(data);

                          return `Análisis del correo #${email.id} completado.`;
                        })
                      }
                    >
                      {getRisk(email) ? "Reanalizar" : "Analizar"}
                    </button>
                  </div>

                  <details className="mw-details">
                    <summary>Revisar o corregir clasificación</summary>

                    <div className="mw-details-body">
                      <p className="mw-muted">
                        Tu valoración queda guardada como feedback.
                        No cambia automáticamente el análisis ni libera
                        el correo de cuarentena.
                      </p>

                      {renderFeedback(email)}
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            <Pagination
              page={currentEmailPage}
              totalPages={emailTotalPages}
              totalItems={filteredEmails.length}
              disabled={busy}
              onPageChange={setEmailPage}
            />
          </>
        )}
      </section>

      <section
        id="quarantine"
        className="mw-panel"
        aria-labelledby="quarantine-title"
      >
        <div className="mw-section-heading">
          <div>
            <p className="mw-eyebrow mw-quarantine-eyebrow">
              <ShieldAlert size={15} />
              REVISIÓN DE RIESGO
            </p>

            <h2 id="quarantine-title">
              Cuarentena simulada
              <span className="mw-count mw-count-danger">
                {loaded ? quarantine.length : "—"}
              </span>
            </h2>

            <p className="mw-muted">
              Correos aislados de la lista de disponibles.
              Esta acción no modifica Gmail.
            </p>
          </div>
        </div>

        <div className="mw-toolbar">
          <div className="mw-search">
            <Search size={18} aria-hidden="true" />

            <input
              type="search"
              aria-label="Buscar correos en cuarentena"
              placeholder="Buscar en cuarentena…"
              value={quarantineSearch}
              onChange={(event) => {
                setQuarantineSearch(event.target.value);
                setQuarantinePage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <p className="mw-empty" role="status">
            Cargando cuarentena…
          </p>
        ) : !loaded ? (
          <div className="mw-empty">
            <ShieldAlert size={32} />
            <h3>No se pudo consultar la cuarentena</h3>
            <p>Utiliza el botón Actualizar de la bandeja.</p>
          </div>
        ) : visibleQuarantine.length === 0 ? (
          <div className="mw-empty">
            <Inbox size={32} />

            <h3>
              {quarantine.length === 0
                ? "No hay correos en cuarentena"
                : "No encontramos coincidencias"}
            </h3>

            <p>
              {quarantine.length === 0
                ? "Aquí aparecerán los correos que el sistema aísle."
                : "Prueba con otro asunto, remitente o ID."}
            </p>
          </div>
        ) : (
          <>
            <ul className="mw-email-list">
              {visibleQuarantine.map((email) => (
                <li className="mw-email-row" key={email.id}>
                  <div className="mw-email-main">
                    <span className="mw-email-icon mw-danger-icon">
                      <ShieldAlert size={21} />
                    </span>

                    <div className="mw-email-info">
                      <h3>{email.subject || "Sin asunto"}</h3>

                      <p>
                        #{email.id} · {email.sender}
                      </p>

                      <div className="mw-email-badge">
                        <RiskBadge category="Malicious" />
                      </div>
                    </div>
                  </div>

                  <details className="mw-details">
                    <summary>
                      Ver motivos y revisar clasificación
                    </summary>

                    <div className="mw-details-body">
                      <h4>Motivo del aislamiento</h4>

                      <p className="mw-quarantine-reason">
                        {traducirMotivo(email.reason)}
                      </p>

                      <h4>Indicadores detectados</h4>

                      {email.indicators.length > 0 ? (
                        <ul className="mw-indicators">
                          {email.indicators.map(
                            (indicator, index) => (
                              <li key={`${email.id}-${index}`}>
                                {traducirIndicador(indicator)}
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="mw-muted">
                          No hay indicadores adicionales.
                        </p>
                      )}

                      <p className="mw-help">
                        Aislado:{" "}
                        {new Date(
                          email.quarantined_at,
                        ).toLocaleString("es-CO")}
                      </p>

                      {renderFeedback(email, true)}
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            <Pagination
              page={currentQuarantinePage}
              totalPages={quarantineTotalPages}
              totalItems={filteredQuarantine.length}
              disabled={busy}
              onPageChange={setQuarantinePage}
            />
          </>
        )}
      </section>
    </div>
  );
}