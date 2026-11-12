import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "../api/axios";
import { traducirIndicador } from "../lib/textos";
import RiskBadge from "./RiskBadge";

type GmailMessage = {
  id: string;
  sender: string;
  subject: string;
};

type AnalysisResult = {
  riskLevel: string;
  indicators: string[];
};

const riskCategories: Record<string, string> = {
  HIGH: "Malicious",
  MEDIUM: "Suspicious",
  LOW: "Safe",
};

export default function GmailPanel() {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(true);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [result, setResult] = useState<{
    subject: string;
    analysis: AnalysisResult;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const authorizationError = url.searchParams.get("error");
    const googleIssuer =
      url.searchParams.get("iss") === "https://accounts.google.com";

    if (code || state || authorizationError || googleIssuer) {
      for (const key of [
        "code",
        "state",
        "error",
        "error_description",
        "scope",
        "authuser",
        "prompt",
        "iss",
      ]) {
        url.searchParams.delete(key);
      }

      window.history.replaceState(null, "", url);
    }

    async function initialize() {
      try {
        if (code && state && !authorizationError) {
          const { data } = await api.post<{ connected: boolean }>(
            "/gmail/callback",
            { code, state },
          );
          setConnected(data.connected);
          return;
        }

        const { data } = await api.get<{ connected: boolean }>(
          "/gmail/connection",
        );
        setConnected(data.connected);

        if (authorizationError) {
          setError(
            authorizationError === "access_denied"
              ? "Cancelaste la autorización de Gmail."
              : "Google no pudo autorizar la conexión.",
          );
        } else if (code || state) {
          setError(
            "La respuesta de Google está incompleta. Vuelve a conectar Gmail.",
          );
        }
      } catch {
        setError("No se pudo conectar con Gmail. Inténtalo de nuevo.");
      } finally {
        setBusy(false);
      }
    }

    void initialize();
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await action();
    } catch (cause) {
      const response = (cause as {
        response?: { status?: number; data?: { message?: string } };
      }).response;

      if (response?.status === 409) {
        setConnected(false);
        setMessages([]);
        setResult(null);
      }

      setError(response?.data?.message ?? "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }

  function connect() {
    return run(async () => {
      const { data } = await api.post<{ url: string }>("/gmail/connect");
      window.location.assign(data.url);
    });
  }

  function loadMessages() {
    return run(async () => {
      setResult(null);
      const { data } = await api.get<GmailMessage[]>("/gmail/messages");
      setMessages(data);

      if (data.length === 0) {
        setNotice("No hay correos en la bandeja de entrada.");
      }
    });
  }

  function analyze(message: GmailMessage) {
    return run(async () => {
      setResult(null);
      const { data } = await api.post<AnalysisResult>(
        `/gmail/messages/${encodeURIComponent(message.id)}/analyze`,
      );

      setResult({ subject: message.subject, analysis: data });
    });
  }

  function disconnect() {
    return run(async () => {
      await api.delete("/gmail/connection");
      setConnected(false);
      setMessages([]);
      setResult(null);
      setNotice("Gmail se desconectó de esta sesión.");
    });
  }

  const indicatorCounts = new Map<string, number>();

  for (const indicator of result?.analysis.indicators ?? []) {
    indicatorCounts.set(indicator, (indicatorCounts.get(indicator) ?? 0) + 1);
  }

  return (
    <section className="mw-panel" aria-labelledby="gmail-heading">
      <div className="mw-section-heading">
        <div>
          <h2 id="gmail-heading">
            <Mail size={21} aria-hidden="true" />
            Analizar correos de Gmail
          </h2>
          <p className="mw-muted">
            Consulta hasta cinco correos de tu bandeja con acceso de solo lectura.
          </p>
        </div>

        <div className="mw-actions">
          {!connected ? (
            <button
              type="button"
              className="mw-button mw-primary"
              disabled={busy}
              onClick={() => void connect()}
            >
              Conectar Gmail
            </button>
          ) : (
            <>
              <button
                type="button"
                className="mw-button mw-primary"
                disabled={busy}
                onClick={() => void loadMessages()}
              >
                Cargar últimos correos
              </button>
              <button
                type="button"
                className="mw-button mw-secondary"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                Desconectar Gmail
              </button>
            </>
          )}
        </div>
      </div>

      {busy && (
        <p className="mw-muted mt-4" role="status">
          Procesando…
        </p>
      )}

      {error && (
        <p className="mw-message mw-error mt-4" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="mw-message mw-success mt-4" role="status">
          {notice}
        </p>
      )}

      {connected && messages.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Bandeja de entrada · {messages.length}{" "}
            {messages.length === 1 ? "correo" : "correos"}
          </h3>

          <ul className="mw-email-list">
            {messages.map((message) => (
              <li key={message.id} className="mw-email-row">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="mw-email-icon" aria-hidden="true">
                    <Mail size={17} />
                  </div>

                  <div className="mw-email-info min-w-0 [overflow-wrap:anywhere]">
                    <h3>{message.subject}</h3>
                    <p className="mw-muted">{message.sender}</p>
                  </div>

                  <button
                    type="button"
                    className="mw-button mw-secondary"
                    disabled={busy}
                    onClick={() => void analyze(message)}
                  >
                    Analizar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div aria-live="polite">
        {connected && result && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Resultado del análisis
              </h3>
              <RiskBadge
                category={
                  riskCategories[result.analysis.riskLevel] ??
                  result.analysis.riskLevel
                }
              />
            </div>

            <p className="mt-2 text-sm text-slate-700 [overflow-wrap:anywhere]">
              {result.subject}
            </p>

            {indicatorCounts.size > 0 ? (
              <ul className="mt-3 space-y-2">
                {[...indicatorCounts].map(([indicator, count]) => (
                  <li
                    key={indicator}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <span>{traducirIndicador(indicator)}</span>
                    {count > 1 && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {count} veces
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mw-muted mt-3">
                El motor no encontró indicadores en el texto analizado.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}