/**
 * Selector del nivel de sensibilidad (US-06, issue #8).
 *
 * Los dos criterios del issue son que el cambio se guarde y que el análisis use
 * la nueva configuración. Lo primero se ve aquí; lo segundo lo hace el backend
 * (`backend/src/analysis/umbrales.ts`).
 *
 * El texto explica qué cambia en términos de consecuencias —cuántos correos se
 * marcan— y no de umbrales, porque «alto con 2 indicadores en vez de 3» no le
 * dice nada a quien solo quiere leer su correo.
 */

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { api } from "../api/axios";

export type Sensibilidad = "estandar" | "estricto";

const OPCIONES: { valor: Sensibilidad; titulo: string; detalle: string }[] = [
  {
    valor: "estandar",
    titulo: "Estándar",
    detalle: "Avisa solo cuando hay indicios claros. Menos falsas alarmas.",
  },
  {
    valor: "estricto",
    titulo: "Estricto",
    detalle:
      "Avisa ante la menor sospecha. Detecta más amenazas, pero marcará " +
      "algunos correos legítimos.",
  },
];

export default function Sensibilidad({
  onCambio,
}: {
  onCambio?: (sensibilidad: Sensibilidad) => void;
}) {
  const [sensibilidad, setSensibilidad] = useState<Sensibilidad | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ sensibilidad: Sensibilidad }>("/configuracion")
      .then((respuesta) => setSensibilidad(respuesta.data.sensibilidad))
      .catch(() => setError("No se pudo leer la configuración guardada."));
  }, []);

  async function cambiar(valor: Sensibilidad) {
    if (valor === sensibilidad) return;

    const anterior = sensibilidad;
    setGuardando(true);
    setError("");
    setMensaje("");
    // Se pinta el cambio de inmediato y se revierte si el guardado falla: así
    // la pantalla nunca afirma algo que la base de datos no tiene.
    setSensibilidad(valor);

    try {
      await api.put("/configuracion", { sensibilidad: valor });
      setMensaje("Configuración guardada. Se aplica al próximo análisis.");
      onCambio?.(valor);
    } catch {
      setSensibilidad(anterior);
      setError("No se pudo guardar el cambio. Inténtalo otra vez.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section id="configuracion" className="rounded-2xl bg-white p-6">
      <div className="flex items-center gap-3">
        <SlidersHorizontal size={20} className="text-slate-500" />
        <h2 className="text-xl font-bold">Sensibilidad del análisis</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Decide qué tan desconfiado quieres que sea MailWatch.
      </p>

      {sensibilidad === null && !error ? (
        <p role="status" className="mt-4 text-slate-600">
          Cargando configuración…
        </p>
      ) : (
        <fieldset
          disabled={guardando}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <legend className="sr-only">Nivel de sensibilidad</legend>
          {OPCIONES.map((opcion) => {
            const activa = sensibilidad === opcion.valor;
            return (
              <label
                key={opcion.valor}
                className={`cursor-pointer rounded-xl border-2 p-4 ${
                  activa
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                } ${guardando ? "opacity-60" : ""}`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <input
                    type="radio"
                    name="sensibilidad"
                    value={opcion.valor}
                    checked={activa}
                    onChange={() => cambiar(opcion.valor)}
                  />
                  {opcion.titulo}
                </span>
                <span className="mt-2 block text-sm text-slate-600">
                  {opcion.detalle}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {guardando && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          Guardando…
        </p>
      )}
      {mensaje && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {mensaje}
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
