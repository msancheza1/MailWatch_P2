import { useEffect, useState } from "react";
import { api } from "../api/axios";

type Email = { id: number; sender: string; subject: string };
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
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const [available, isolated] = await Promise.all([
      api.get("/emails"),
      api.get("/quarantine"),
    ]);
    setEmails(available.data);
    setQuarantine(isolated.data);
  }

  useEffect(() => {
    Promise.all([api.get("/emails"), api.get("/quarantine")])
      .then(([available, isolated]) => {
        setEmails(available.data);
        setQuarantine(isolated.data);
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
                  </div>
                  <button
                    disabled={busy}
                    className="rounded-lg bg-blue-100 px-4 py-2 disabled:opacity-50"
                    onClick={() =>
                      run(async () => {
                        const { data } = await api.post(
                          "/analysis/" + email.id
                        );
                        return (
                          "Correo #" +
                          email.id +
                          ": " +
                          data.category +
                          (data.status === "quarantined"
                            ? " — enviado a cuarentena."
                            : " — permanece disponible.")
                        );
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
                  <p className="mt-2 text-red-700">{email.reason}</p>
                  <ul className="mt-2 list-inside list-disc text-sm">
                    {email.indicators.map((indicator, index) => (
                      <li key={index}>{indicator}</li>
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
