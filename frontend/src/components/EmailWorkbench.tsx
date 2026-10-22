import { useEffect, useState } from "react";
import { api } from "../api/axios";
import RiskBadge from "./RiskBadge";

type Email = {
  id: number;
  sender: string;
  subject: string;
};

type IsolatedEmail = Email & {
  reason: string;
  indicators: string[];
  quarantined_at: string;
  riskScore: number;
  content?: string;
};

type AnalysisResult = {
  category: string;
  status: string;
  reason: string;
  risk: string;
  riskScore: number;
  indicators: string[];
};

export default function EmailWorkbench({
  onChange,
}: {
  onChange: () => Promise<void>;
}) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [quarantine, setQuarantine] = useState<IsolatedEmail[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<Record<number, string>>({});
  const [analysis, setAnalysis] = useState<Record<number, AnalysisResult>>({});
  const [selected, setSelected] = useState<IsolatedEmail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  async function refresh() {
    const [available, isolated] = await Promise.all([
      api.get("/emails"),
      api.get("/quarantine"),
    ]);

    setEmails(available.data);
    setQuarantine(isolated.data);
  }

  useEffect(() => {
    refresh()
      .catch(() => {
        setError(
          "No se pudieron cargar los correos. Comprueba el servidor y la base de datos.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await action();
      await Promise.all([refresh(), onChange()]);
      setMessage(result);
    } catch {
      setError(
        "No se pudo completar la operación. Comprueba el servidor e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleDetails(email: IsolatedEmail) {
    // Si ya están abiertos los detalles de este correo, los ocultamos.
    if (selected?.id === email.id) {
      setSelected(null);
      setError("");
      return;
    }

    setError("");
    setMessage("");
    setLoadingDetails(true);

    try {
      const { data } = await api.get<IsolatedEmail>(
        `/quarantine/${email.id}`,
      );

      setSelected(data);
    } catch {
      // Si el endpoint de detalle falla, mostramos los datos ya cargados
      // en la lista para que el botón siga siendo útil.
      setSelected(email);
      setError(
        "No se pudieron actualizar los detalles desde el servidor. Se muestran los datos disponibles en la lista.",
      );
    } finally {
      setLoadingDetails(false);
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={busy || loading}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={() =>
            run(async () => {
              const response = await api.post("/emails/upload");
              return `${response.data.inserted} correos de prueba cargados.`;
            })
          }
        >
          Cargar dataset de prueba
        </button>

        <button
          disabled={busy || loading}
          className="rounded-xl border px-4 py-2 disabled:opacity-50"
          onClick={() => run(async () => "Lista actualizada.")}
        >
          Actualizar
        </button>

        {busy && <span role="status">Procesando…</span>}
      </div>

      <p className="text-sm text-slate-600">
        La cuarentena es simulada: no modifica Gmail ni envía correos.
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-red-100 p-3 text-red-800">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="rounded-xl bg-green-100 p-3 text-green-800">
          {message}
        </p>
      )}

      {loading ? (
        <p role="status">Cargando correos…</p>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">
              Correos disponibles ({emails.length})
            </h2>

            {emails.length === 0 && <p>No hay correos disponibles.</p>}

            <ul className="divide-y">
              {emails.map((email) => (
                <li
                  key={email.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{email.subject}</p>
                    <p className="text-sm text-slate-600">
                      #{email.id} · {email.sender}
                    </p>

                    <RiskBadge category={categories[email.id]} />

                    {analysis[email.id] && (
                      <div className="mt-2 text-sm">
                        <p>
                          <strong>Puntaje de riesgo:</strong>{" "}
                          {analysis[email.id].riskScore}/100
                        </p>
                        <p>{analysis[email.id].reason}</p>

                        {analysis[email.id].indicators.length > 0 && (
                          <ul className="list-inside list-disc">
                            {analysis[email.id].indicators.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={busy}
                    className="rounded-lg bg-blue-100 px-4 py-2 disabled:opacity-50"
                    onClick={() =>
                      run(async () => {
                        const { data } = await api.post<AnalysisResult>(
                          `/analysis/${email.id}`,
                        );

                        setCategories((prev) => ({
                          ...prev,
                          [email.id]: data.category,
                        }));

                        setAnalysis((prev) => ({
                          ...prev,
                          [email.id]: data,
                        }));

                        return `Correo #${email.id}: ${data.category}. ${
                          data.status === "quarantined"
                            ? "Enviado a cuarentena."
                            : "Permanece disponible."
                        }`;
                      })
                    }
                  >
                    Analizar
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div id="quarantine" className="rounded-2xl bg-white p-6">
            <h2 className="mb-2 text-xl font-bold">
              Cuarentena ({quarantine.length})
            </h2>

            {quarantine.length === 0 && (
              <p>No hay correos en cuarentena.</p>
            )}

            <ul className="divide-y">
              {quarantine.map((email) => {
                const isSelected = selected?.id === email.id;

                return (
                  <li key={email.id} className="py-4">
                    <p className="font-semibold">{email.subject}</p>
                    <p className="text-sm text-slate-600">
                      #{email.id} · {email.sender}
                    </p>

                    <RiskBadge category="Malicious" />

                    <p className="mt-2 text-xs text-slate-500">
                      Aislado:{" "}
                      {new Date(email.quarantined_at).toLocaleString()}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || loadingDetails}
                        className="rounded-lg border px-3 py-2 disabled:opacity-50"
                        aria-expanded={isSelected}
                        onClick={() => void toggleDetails(email)}
                      >
                        {loadingDetails
                          ? "Cargando…"
                          : isSelected
                            ? "Ocultar detalles"
                            : "Ver detalles"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg bg-green-100 px-3 py-2 disabled:opacity-50"
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Seguro que quieres liberar este correo?",
                            )
                          ) {
                            void run(async () => {
                              await api.post(
                                `/quarantine/${email.id}/release`,
                              );

                              if (selected?.id === email.id) {
                                setSelected(null);
                              }

                              return `Correo #${email.id} liberado de cuarentena.`;
                            });
                          }
                        }}
                      >
                        Liberar
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg bg-red-100 px-3 py-2 text-red-800 disabled:opacity-50"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Esta acción eliminará permanentemente el correo. ¿Continuar?",
                            )
                          ) {
                            void run(async () => {
                              await api.delete(`/quarantine/${email.id}`);

                              if (selected?.id === email.id) {
                                setSelected(null);
                              }

                              return `Correo #${email.id} eliminado.`;
                            });
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>

                    {isSelected && (
                      <div
                        className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        aria-label={`Detalles del correo ${email.id}`}
                      >
                        <h3 className="text-lg font-bold">
                          Detalles del correo #{selected.id}
                        </h3>

                        <p className="mt-3 break-words">
                          <strong>Asunto:</strong> {selected.subject}
                        </p>
                        <p className="break-words">
                          <strong>Remitente:</strong> {selected.sender}
                        </p>
                        <p className="mt-2">
                          <strong>Motivo:</strong> {selected.reason}
                        </p>
                        <p className="mt-2">
                          <strong>Puntaje de riesgo:</strong>{" "}
                          {selected.riskScore}/100
                        </p>

                        <p className="mt-3 font-semibold">
                          Indicadores detectados
                        </p>

                        {selected.indicators?.length ? (
                          <ul className="list-inside list-disc">
                            {selected.indicators.map((indicator, index) => (
                              <li key={index}>{indicator}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>No hay indicadores registrados.</p>
                        )}

                        {selected.content && (
                          <p className="mt-3 whitespace-pre-wrap break-words">
                            <strong>Contenido:</strong> {selected.content}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}