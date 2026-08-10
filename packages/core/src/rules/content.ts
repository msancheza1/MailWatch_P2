import type { EmailMessage, Signal } from '../types.js';
import { countMatches } from './util.js';

const URGENCY = ['urgente', 'inmediato', 'último aviso', 'última oportunidad', 'en las próximas 24 horas', 'antes de que', 'expira hoy', 'acción requerida', 'no ignore', 'within 24 hours', 'verify now', 'action required', 'immediately'];

const THREAT = ['será suspendida', 'será bloqueada', 'será eliminada', 'cuenta bloqueada', 'cuenta suspendida', 'acceso restringido', 'proceso judicial', 'sanción', 'multa', 'embargo', 'will be suspended', 'will be terminated', 'account has been locked'];

const CREDENTIALS = ['confirma tu contraseña', 'ingresa tu contraseña', 'verifica tu contraseña', 'confirma su contraseña', 'confirme su contraseña', 'confirma tu usuario', 'envía tu código', 'comparte tu código', 'responde con tu código', 'responda este correo con su', 'valida tu identidad', 'validar tu identidad', 'confirm your password', 'verify your password', 'confirm your account details'];

const SENSITIVE_DATA = ['número de tarjeta', 'número de cédula', 'cvv', 'fecha de vencimiento', 'datos bancarios', 'número de cuenta', 'pin de seguridad', 'billing details'];

const LURE = ['has ganado', 'premio', 'lotería', 'sorteo', 'herencia', 'reembolso', 'devolución de impuestos', 'transferencia pendiente', 'dinero retenido', 'bono de'];

const PAYMENT_REDIRECT = ['cambio de cuenta bancaria', 'nueva cuenta bancaria', 'cambio de entidad bancaria', 'realices la transferencia', 'realizar la transferencia', 'realice la transferencia', 'registrar de nuevo su número de cuenta', 'actualizar la cuenta de nómina', 'tarjetas de regalo'];

const GENERIC_GREETING = ['estimado cliente', 'estimado usuario', 'querido usuario', 'apreciado cliente', 'dear customer', 'hola usuario'];

interface Pattern {
  id: string;
  terms: readonly string[];
  weight: number;
  explain: (hits: string[]) => string;
}

const PATTERNS: readonly Pattern[] = [
  {
    id: 'content.credential-request',
    terms: CREDENTIALS,
    weight: 30,
    explain: (hits) =>
      `El mensaje te pide directamente tus credenciales ("${hits[0]}"). Ninguna empresa legítima pide contraseñas ni códigos por correo.`,
  },
  {
    id: 'content.sensitive-data-request',
    terms: SENSITIVE_DATA,
    weight: 28,
    explain: (hits) =>
      `Se solicitan datos financieros o personales sensibles ("${hits[0]}"), algo que nunca debería pedirse por correo.`,
  },
  {
    id: 'content.payment-redirect',
    terms: PAYMENT_REDIRECT,
    weight: 28,
    explain: (hits) =>
      `Se pide mover dinero o cambiar una cuenta de destino ("${hits[0]}"). Es el patrón del fraude por suplantación de jefe o proveedor: confirma siempre por teléfono antes de pagar.`,
  },
  {
    id: 'content.threat',
    terms: THREAT,
    weight: 18,
    explain: (hits) =>
      `El correo amenaza con consecuencias ("${hits[0]}") para que actúes sin pensar. Es presión psicológica, no un aviso real.`,
  },
  {
    id: 'content.urgency',
    terms: URGENCY,
    weight: 10,
    explain: (hits) =>
      `Se usa lenguaje de urgencia ("${hits[0]}") para que no te detengas a verificar la información.`,
  },
  {
    id: 'content.financial-lure',
    terms: LURE,
    weight: 20,
    explain: (hits) =>
      `Se ofrece un beneficio económico inesperado ("${hits[0]}"), el gancho más común en estafas por correo.`,
  },
  {
    id: 'content.generic-greeting',
    terms: GENERIC_GREETING,
    weight: 8,
    explain: (hits) =>
      `El saludo es genérico ("${hits[0]}"). Las empresas con las que tienes cuenta normalmente te llaman por tu nombre.`,
  },
];

/**
 * RF-02: análisis del contenido (ingeniería social).
 *
 * Los términos se escriben con su ortografía correcta porque se muestran tal
 * cual en la explicación; la comparación ignora tildes y mayúsculas.
 */
export function analyzeContent(email: EmailMessage): Signal[] {
  const text = `${email.subject}\n${email.body}`;
  const signals: Signal[] = [];

  for (const pattern of PATTERNS) {
    const hits = countMatches(text, pattern.terms);
    if (hits.length === 0) continue;
    signals.push({
      id: pattern.id,
      category: 'content',
      // Varias coincidencias del mismo patrón refuerzan, pero con rendimiento decreciente.
      weight: Math.round(pattern.weight * (1 + Math.min(hits.length - 1, 2) * 0.25)),
      explanation: pattern.explain(hits),
      evidence: hits.join(', '),
    });
  }

  return signals;
}
