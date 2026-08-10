import type { RiskLevel, Signal, SignalCategory } from './types.js';

const CATEGORY_LABEL: Record<SignalCategory, string> = {
  sender: 'el remitente',
  domain: 'el dominio',
  links: 'los enlaces',
  attachments: 'los adjuntos',
  content: 'el contenido',
};

const OPENING: Record<RiskLevel, string> = {
  safe: 'No encontramos indicios de fraude en este correo.',
  suspicious: 'Este correo tiene señales que no encajan y conviene revisarlo antes de actuar.',
  malicious: 'Este correo presenta señales claras de fraude y se movió a cuarentena.',
};

/**
 * RF-04: convierte las señales técnicas en una explicación que entienda alguien
 * sin conocimientos de seguridad. La transparencia es el diferenciador del
 * producto frente a los filtros de Gmail, así que siempre citamos la evidencia.
 */
export function buildSummary(signals: readonly Signal[], score: number, level: RiskLevel): string {
  const risky = signals.filter((s) => s.weight > 0);

  if (risky.length === 0) {
    return `${OPENING.safe} El remitente está identificado y no hay enlaces, adjuntos ni frases típicas de estafa (riesgo ${score}/100).`;
  }

  const top = [...risky].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const categories = [...new Set(risky.map((s) => s.category))].map((c) => CATEGORY_LABEL[c]);

  const reasons = top.map((signal) => `• ${signal.explanation}`).join('\n');
  const scope =
    categories.length === 1
      ? `Detectamos problemas en ${categories[0]}`
      : `Detectamos problemas en ${categories.slice(0, -1).join(', ')} y ${categories.at(-1)}`;

  return `${OPENING[level]} ${scope} (riesgo ${score}/100).\n\n${reasons}`;
}

/** Recomendación accionable que se muestra bajo la explicación. */
export function recommendedAction(level: RiskLevel): string {
  switch (level) {
    case 'malicious':
      return 'No abras los enlaces ni los adjuntos. Si crees que el mensaje sí era legítimo, entra al sitio oficial escribiendo la dirección tú mismo.';
    case 'suspicious':
      return 'Verifica por otro canal antes de responder o hacer clic: llama a la empresa o entra a su sitio oficial directamente.';
    case 'safe':
      return 'Puedes leerlo con normalidad. Aun así, nunca escribas contraseñas en una página a la que llegaste desde un correo.';
  }
}
