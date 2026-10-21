/**
 * Etiqueta visual de la clasificación de riesgo (US-03).
 *
 * Las categorías que devuelve `POST /analysis/:id` son Safe, Suspicious y
 * Malicious. Se conservan en inglés en el código y en la API porque así están
 * escritas en los criterios de aceptación y en los casos de prueba del Sprint 1
 * (#31 a #39), pero al usuario se le muestran en español: el producto es en
 * español.
 */

import { traducirCategoria } from "../lib/textos";

type Categoria = "Safe" | "Suspicious" | "Malicious";

const ESTILOS: Record<Categoria, string> = {
  Safe: "bg-emerald-500",
  Suspicious: "bg-orange-400",
  Malicious: "bg-red-500",
};

const DESCRIPCIONES: Record<Categoria, string> = {
  Safe: "Sin indicadores de phishing",
  Suspicious: "Revisar antes de actuar",
  Malicious: "Riesgo alto, no interactuar",
};

export default function RiskBadge({ category }: { category?: string }) {
  if (!category) {
    return (
      <span className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-500">
        Sin analizar
      </span>
    );
  }

  const categoria = category as Categoria;
  const color = ESTILOS[categoria] ?? "bg-slate-500";

  return (
    <span
      title={DESCRIPCIONES[categoria]}
      className={`${color} rounded-full px-3 py-1 text-xs font-semibold text-white`}
    >
      {traducirCategoria(category)}
    </span>
  );
}
