import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { SlidersHorizontal } from "lucide-react";

import { api } from "../api/axios";

type Modo = "estandar" | "estricto";
type Nivel = "medio" | "alto";
type Umbrales = Record<Modo, Record<Nivel, number>>;

const MODOS = [
  { valor: "estandar", titulo: "Estándar" },
  { valor: "estricto", titulo: "Estricto" },
] as const;
const NIVELES = ["medio", "alto"] as const;
const ENDPOINT = "/configuracion/umbrales";

export default function UmbralesClasificacion() {
  const [umbrales, setUmbrales] = useState<Umbrales | null>(null);
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<Umbrales>(ENDPOINT, { signal: controller.signal })
      .then(({ data }) => setUmbrales(data))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (isAxiosError(cause) && cause.response?.status === 403) return;
        setError("No se pudieron cargar los umbrales.");
      });

    return () => controller.abort();
  }, [intento]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const leerModo = (modo: Modo) => ({
      medio: Number(datos.get(`${modo}-medio`)),
      alto: Number(datos.get(`${modo}-alto`)),
    });

    setGuardando(true);
    setGuardado(false);
    setError("");

    try {
      const { data } = await api.put<Umbrales>(ENDPOINT, {
        estandar: leerModo("estandar"),
        estricto: leerModo("estricto"),
      });
      setUmbrales(data);
      setGuardado(true);
    } catch (cause) {
      if (isAxiosError<{ message?: string }>(cause)) {
        if (cause.response?.status === 403) {
          setUmbrales(null);
          return;
        }
        if (
          (cause.response?.status === 400 || cause.response?.status === 503) &&
          cause.response.data.message
        ) {
          setError(cause.response.data.message);
          return;
        }
      }
      setError("No se pudieron guardar los umbrales. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (!umbrales && !error) return null;

  return (
    <section
      className="mt-4 rounded-2xl bg-white p-6"
      aria-labelledby="umbrales-titulo"
    >
      <div className="flex items-center gap-3">
        <SlidersHorizontal size={20} className="text-slate-500" />
        <h2 id="umbrales-titulo" className="text-xl font-bold">
          Umbrales de clasificación
        </h2>
      </div>

      {umbrales ? (
        <form onSubmit={guardar} onChange={() => setGuardado(false)}>
          <p className="mt-2 text-sm text-slate-600">
            Define el mínimo de indicadores para riesgo medio y alto en cada
            modo. El cambio se aplica a los próximos análisis.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {MODOS.map(({ valor, titulo }) => (
              <fieldset
                key={valor}
                disabled={guardando}
                className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"
              >
                <legend className="px-1 text-sm font-semibold">{titulo}</legend>

                {NIVELES.map((nivel) => (
                  <label key={nivel} className="mw-field">
                    <span className="text-sm font-semibold">Riesgo {nivel}</span>
                    <input
                      type="number"
                      name={`${valor}-${nivel}`}
                      defaultValue={umbrales[valor][nivel]}
                      min={1}
                      max={2147483647}
                      step={1}
                      required
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>

          <button
            type="submit"
            className="mw-button mw-primary mt-4"
            disabled={guardando}
          >
            {guardando ? "Guardando…" : "Guardar umbrales"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="mw-button mw-secondary mt-4"
          onClick={() => {
            setError("");
            setIntento((actual) => actual + 1);
          }}
        >
          Reintentar
        </button>
      )}

      {guardado && (
        <p role="status" className="mt-3 text-sm text-green-700">
          Umbrales guardados.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
