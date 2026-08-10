/** Utilidades compartidas por las reglas de análisis. */

/** Sufijos de dos niveles frecuentes en el contexto colombiano. */
const MULTI_LABEL_SUFFIXES = new Set([
  'com.co',
  'gov.co',
  'edu.co',
  'org.co',
  'net.co',
  'co.uk',
  'com.mx',
  'com.ar',
  'com.br',
]);

/**
 * Proveedores de correo gratuito. Son legítimos: la mayoría de la gente escribe
 * desde aquí. Solo importan cuando alguien dice ser una empresa (lo revisa
 * `analyzeSender`), nunca como indicio de suplantación de dominio.
 */
export const FREEMAIL = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'yahoo.com',
  'yahoo.es',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'mail.com',
]);

export function domainOf(address: string): string {
  const at = address.lastIndexOf('@');
  return at === -1 ? '' : address.slice(at + 1).toLowerCase().trim();
}

/** Dominio registrable: `pagos.secure-bancolombia.co` -> `secure-bancolombia.co`. */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, '').split('.');
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  if (MULTI_LABEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
  return lastTwo;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  // Solo necesitamos una fila: cada celda depende de izquierda, arriba y diagonal.
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = row;
  }
  return prev[b.length]!;
}

/** Marcas diacríticas combinantes (U+0300–U+036F), para comparar sin tildes. */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '');
}

/** Cuenta cuántos de estos términos aparecen en el texto normalizado. */
export function countMatches(text: string, terms: readonly string[]): string[] {
  const haystack = normalize(text);
  return terms.filter((term) => haystack.includes(normalize(term)));
}
