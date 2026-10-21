import { useEffect, useState } from "react";
import { api } from "../api/axios";
import FeedbackButtons, { type Feedback } from "./FeedbackButtons";
import RiskBadge from "./RiskBadge";
import AlertaRiesgo, { type ResultadoAnalisis } from "./AlertaRiesgo";
import { traducirIndicador, traducirMotivo } from "../lib/textos";

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

export default function EmailWorkbench({
  onChange,
}: {
  onChange: () => Promise<void>;
}) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [quarantine, setQuarantine] = useState<IsolatedEmail[]>([]);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // Clasificación devuelta por el análisis, guardada por id de correo (US-03).
  const [categories, setCategories] = useState<Record<number, string>>({});
  // Último análisis; alimenta la alerta de correo peligroso (US-09).
  const [ultimoAnalisis, setUltimoAnalisis] =
    useState<ResultadoAnalisis | null>(null);

  function applyFeedback(items: Feedback[]) {
    setFeedback(Object.fromEntries(items.map((item) => [item.email_id, item])));
  }

  async function refresh() {
    const [available, isolated, reports] = await Promise.all([
      api.get("/emails"),
      api.get("/quarantine"),
      api.get<Feedback[]>("/feedback"),
    ]);
    setEmails(available.data);
    setQuarantine(isolated.data);
    applyFeedback(reports.data);
  }

  useEffect(() => {
    Promise.all([
      api.get("/emails"),
      api.get("/quarantine"),
      api.get<Feedback[]>("/feedback"),
    ])
      .then(([available, isolated, reports]) => {
        setEmails(available.data);
        setQuarantine(isolated.data);
        applyFeedback(reports.data);
      })
      .catch(() =>
        setError(
          "No se pudieron cargar los correos. Comprueba el servidor y la base de datos."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError("");
    setMessage("");
    setUltimoAnalisis(null);
    try {
      const result = await action();
      await Promise.all([refresh(), onChange()]);
      setMessage(result);
    } catch {
      setError(
        "No se pudo completar o actualizar la operación. Pulsa Actualizar antes de reintentar."
      );
    } finally {
      setBusy(false);
    }
  }

  function report(emailId: number, category: Feedback["category"]) {
    void run(async () => {
      await api.post("/feedback/" + emailId, { category });
      return `Retroalimentación guardada: correo #${emailId} marcado como ${category === "Safe" ? "seguro" : "peligroso"}.`;
    });
  }

  function feedbackControls(email: Email, isolated = false) {
    return (
      <FeedbackButtons
        emailId={email.id}
        feedback={feedback[email.id]}
        disabled={busy}
        analyzed={isolated || !!email.risk_level || !!categories[email.id]}
        onReport={report}
      />
    );
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
              return response.data.inserted + " correos de prueba cargados.";
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
        Cada carga añade una copia del dataset. La cuarentena es simulada y no
        modifica Gmail.
      </p>
      <p className="text-sm text-slate-600">
        ¿La clasificación es incorrecta? Marca el correo como seguro o
        peligroso. Tu valoración queda guardada para revisar errores; no cambia
        automáticamente el análisis ni libera correos de cuarentena.
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
      {ultimoAnalisis && (
        <AlertaRiesgo
          resultado={ultimoAnalisis}
          onCerrar={() => setUltimoAnalisis(null)}
        />
      )}
      {loading ? (
        <p role="status">Cargando correos…</p>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">
              Correos disponibles ({emails.length})
            </h2>
            {emails.length === 0 && (
              <p>
                No hay correos disponibles. Puedes cargar el dataset de prueba.
              </p>
            )}
            <ul className="divide-y">
              {emails.map((email) => (
                <li
                  key={email.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{email.subject}</p>
                    <p className="text-sm text-slate-600">
                      #{email.id} · {email.sender}
                    </p>
                    <p className="mt-2">
                      <RiskBadge
                        category={
                          categories[email.id] ??
                          (email.risk_level === "HIGH"
                            ? "Malicious"
                            : email.risk_level === "MEDIUM"
                              ? "Suspicious"
                              : email.risk_level === "LOW"
                                ? "Safe"
                                : undefined)
                        }
                      />
                    </p>
                    {feedbackControls(email)}
                  </div>
                  <button
                    disabled={busy}
                    className="rounded-lg bg-blue-100 px-4 py-2 disabled:opacity-50"
                    onClick={() =>
                      run(async () => {
                        const { data } = await api.post<ResultadoAnalisis>(
                          "/analysis/" + email.id
                        );
                        setCategories((prev) => ({
                          ...prev,
                          [email.id]: data.category,
                        }));
                        setUltimoAnalisis(data);
                        // El resultado lo cuenta la alerta (US-09), con el
                        // nivel y la acción recomendada, no un mensaje suelto.
                        return "";
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
              Cuarentena simulada ({quarantine.length})
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Correos maliciosos aislados de la lista de disponibles. Los
              motivos se muestran como texto, sin enlaces activos.
            </p>
            {quarantine.length === 0 && <p>No hay correos en cuarentena.</p>}
            <ul className="divide-y">
              {quarantine.map((email) => (
                <li key={email.id} className="py-4">
                  <p className="font-semibold">{email.subject}</p>
                  <p className="text-sm text-slate-600">
                    #{email.id} · {email.sender}
                  </p>
                  <p className="mt-2">
                    <RiskBadge category="Malicious" />
                  </p>
                  {feedbackControls(email, true)}
                  <p className="mt-2 text-red-700">
                    {traducirMotivo(email.reason)}
                  </p>
                  <ul className="mt-2 list-inside list-disc text-sm">
                    {email.indicators.map((indicator, index) => (
                      <li key={index}>{traducirIndicador(indicator)}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">
                    Aislado: {new Date(email.quarantined_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
