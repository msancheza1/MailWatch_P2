import type { EmailMessage, Signal } from '../types.js';
import { brandsMentionedIn } from './brands.js';
import { domainOf, hostOf, registrableDomain } from './util.js';

const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rb.gy', 'ow.ly', 'shorturl.at']);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

const CREDENTIAL_PATHS = ['login', 'signin', 'ingresar', 'acceso', 'verificar', 'validar', 'actualizar', 'seguridad', 'clave', 'password'];

/** RF-02: análisis de enlaces. */
export function analyzeLinks(email: EmailMessage): Signal[] {
  const signals: Signal[] = [];
  if (email.links.length === 0) return signals;

  const senderRegistrable = registrableDomain(domainOf(email.from.address));
  const brandsClaimed = brandsMentionedIn(`${email.from.displayName} ${email.subject}`);
  const seen = new Set<string>();

  const push = (signal: Signal) => {
    // Un mismo tipo de problema no debe puntuar diez veces por diez enlaces.
    if (seen.has(signal.id)) return;
    seen.add(signal.id);
    signals.push(signal);
  };

  for (const link of email.links) {
    const host = hostOf(link.href);

    // Un enlace que ni siquiera se puede interpretar no se puede analizar, y esa
    // ceguera es en sí misma un indicio: los atacantes deforman las direcciones
    // justo para eso. Sin esta señal el enlace se ignoraría en silencio.
    if (!host) {
      push({
        id: 'links.malformed',
        category: 'links',
        weight: 18,
        explanation:
          'El correo trae un enlace con una dirección deformada que no corresponde a ningún sitio válido. Es una técnica para que los filtros no puedan revisar a dónde lleva.',
        evidence: link.href,
      });
      continue;
    }

    const registrable = registrableDomain(host);

    // El texto del enlace aparenta ser un dominio distinto al destino real.
    const textHost = hostOf(link.text.startsWith('http') ? link.text : `https://${link.text}`);
    const textLooksLikeDomain = /^[\w.-]+\.[a-z]{2,}$/i.test(link.text.replace(/^https?:\/\//, '').split('/')[0] ?? '');
    if (textLooksLikeDomain && textHost && registrableDomain(textHost) !== registrable) {
      push({
        id: 'links.display-mismatch',
        category: 'links',
        weight: 32,
        explanation: `El enlace dice llevarte a ${textHost}, pero en realidad abre ${host}. El texto visible y el destino real no coinciden.`,
        evidence: `${link.text} → ${link.href}`,
      });
    }

    if (IPV4.test(host)) {
      push({
        id: 'links.ip-address',
        category: 'links',
        weight: 30,
        explanation: `El enlace apunta directamente a una dirección IP (${host}) en lugar de a un dominio. Los servicios legítimos no hacen esto.`,
        evidence: link.href,
      });
    }

    if (SHORTENERS.has(registrable)) {
      push({
        id: 'links.shortener',
        category: 'links',
        weight: 15,
        explanation: `El enlace usa un acortador (${registrable}), lo que oculta a dónde te lleva realmente hasta que ya hiciste clic.`,
        evidence: link.href,
      });
    }

    const path = link.href.toLowerCase();
    const asksForCredentials = CREDENTIAL_PATHS.some((word) => path.includes(word));
    if (asksForCredentials && link.href.startsWith('http://')) {
      push({
        id: 'links.insecure-login',
        category: 'links',
        weight: 25,
        explanation:
          'El enlace lleva a una página de inicio de sesión sin cifrado (http://). Cualquier dato que escribas ahí viaja en texto plano.',
        evidence: link.href,
      });
    }

    // El correo dice ser de una marca pero los enlaces salen a otro sitio.
    const brandMismatch = brandsClaimed.find(
      (brand) => !brand.domains.some((d) => registrableDomain(d) === registrable),
    );
    if (brandsClaimed.length > 0 && brandMismatch && registrable !== senderRegistrable) {
      push({
        id: 'links.brand-mismatch',
        category: 'links',
        weight: 25,
        explanation: `El correo dice ser de ${brandMismatch.name}, pero el botón de acción te envía a ${registrable}, que no le pertenece.`,
        evidence: link.href,
      });
    }
  }

  return signals;
}
