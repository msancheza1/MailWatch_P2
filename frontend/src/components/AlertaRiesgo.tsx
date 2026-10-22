/**
 * Alerta de correo peligroso (US-09, issue #11).
 *
 * Cubre los tres criterios del issue sobre el resultado de `POST /analysis/:id`:
 * genera la alerta, muestra el nivel de riesgo e indica la acción recomendada.
 *
 * El texto de la acción lo decide el backend (`backend/src/analysis/alerta.ts`),
 * no este componente: es una regla de producto, no de presentación, y la
 * extensión de Chrome y el panel de administrador necesitarán la misma.
 *
 * Un correo seguro también produce panel, pero verde y en `role="status"`.
 * Solo el riesgo alto usa `role="alert"`, que es lo que hace que un lector de
 * pantalla interrumpa y lo anuncie. Si todo alertara, nada alertaría.
 */

import { useEffect, useRef } from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck, X } from "lucide-react";
import RiskBadge from "./RiskBadge";
import { traducirIndicador } from "../lib/textos";

export type NivelRiesgo = "LOW" | "MEDIUM" | "HIGH";

export interface Alerta {
  alertar: boolean;
  nivel: NivelRiesgo;
  etiqueta: string;
  accionRecomendada: string;
}

/** Lo que devuelve `POST /analysis/:id`. */
export interface ResultadoAnalisis {
  emailId: number;
  category: string;
  status: "quarantined" | "available";
  risk: NivelRiesgo;
  indicators: string[];
  alerta: Alerta;
  /** US-06: con qué configuración se tomó esta decisión. */
  sensibilidad?: "estandar" | "estricto";
}

const ESTILOS: Record<
  NivelRiesgo,
  { marco: string; titulo: string; icono: typeof ShieldAlert; color: string }
> = {
  HIGH: {
    marco: "border-red-500 bg-red-50",
    titulo: "text-red-900",
    icono: ShieldAlert,
    color: "text-red-600",
  },
  MEDIUM: {
    marco: "border-orange-400 bg-orange-50",
    titulo: "text-orange-900",
    icono: AlertTriangle,
    color: "text-orange-500",
  },
  LOW: {
    marco: "border-emerald-500 bg-emerald-50",
    titulo: "text-emerald-900",
    icono: ShieldCheck,
    color: "text-emerald-600",
  },
};

export default function AlertaRiesgo({
  resultado,
  onCerrar,
}: {
  resultado: ResultadoAnalisis;
  onCerrar: () => void;
}) {
  const { alerta, indicators, emailId, category, status, sensibilidad } =
    resultado;
  const estilo = ESTILOS[alerta.nivel] ?? ESTILOS.MEDIUM;
  const Icono = estilo.icono;
  const panel = useRef<HTMLElement>(null);

  // La alerta se dibuja arriba de la lista: si el usuario analizó un correo
  // que estaba abajo, se perdería el aviso sin este desplazamiento.
  useEffect(() => {
    if (alerta.alertar) {
      panel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [alerta.alertar, emailId]);

  return (
    <section
      ref={panel}
      role={alerta.alertar ? "alert" : "status"}
      aria-live={alerta.alertar ? "assertive" : "polite"}
      className={`${estilo.marco} rounded-2xl border-l-4 p-6 shadow-sm`}
    >
      <div className="flex items-start gap-4">
        <Icono size={28} className={`${estilo.color} shrink-0`} />

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className={`${estilo.titulo} text-lg font-bold`}>
              {alerta.etiqueta}
            </h3>
            <RiskBadge category={category} />
            <span className="text-sm text-slate-600">Correo #{emailId}</span>
            {sensibilidad && (
              <span className="text-xs text-slate-500">
                sensibilidad {sensibilidad === "estricto" ? "estricta" : "estándar"}
              </span>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Acción recomendada
            </p>
            <p className={`${estilo.titulo} mt-1`}>{alerta.accionRecomendada}</p>
          </div>

          {indicators.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Por qué se clasificó así ({indicators.length})
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {indicators.map((indicador, indice) => (
                  <li key={indice}>{traducirIndicador(indicador)}</li>
                ))}
              </ul>
            </div>
          )}

          {status === "quarantined" && (
            <p className="mt-4 text-sm text-slate-600">
              Puedes verlo en la{" "}
              <a href="#quarantine" className="underline">
                cuarentena simulada
              </a>
              . No se modificó nada en Gmail.
            </p>
          )}
        </div>

        <button
          onClick={onCerrar}
          aria-label="Cerrar la alerta"
          className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-black/5"
        >
          <X size={20} />
        </button>
      </div>
    </section>
  );
}
