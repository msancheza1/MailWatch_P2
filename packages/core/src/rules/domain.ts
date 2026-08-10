import type { EmailMessage, Signal } from '../types.js';
import { ALL_BRAND_DOMAINS, BRANDS } from './brands.js';
import { FREEMAIL, domainOf, levenshtein, registrableDomain } from './util.js';

/** TLDs con tasa de abuso desproporcionada según reportes públicos de spam. */
const HIGH_RISK_TLDS = new Set(['zip', 'top', 'xyz', 'click', 'icu', 'rest', 'cfd', 'sbs', 'mov']);

/** Palabras que los atacantes pegan al nombre de la marca para dar confianza. */
const TRUST_PREFIXES = ['seguro', 'secure', 'verificacion', 'verify', 'soporte', 'support', 'alerta', 'alert', 'cuenta', 'account', 'login', 'portal'];

/** RF-02: análisis del dominio del remitente. */
export function analyzeDomain(email: EmailMessage): Signal[] {
  const signals: Signal[] = [];
  const host = domainOf(email.from.address);
  if (!host) return signals;

  const registrable = registrableDomain(host);
  const isLegitimateBrandDomain = ALL_BRAND_DOMAINS.some(
    (d) => registrableDomain(d) === registrable,
  );
  if (isLegitimateBrandDomain) return signals;

  // `gmail.com` contiene el alias "gmail" y `outlook.com` el alias "outlook":
  // sin esta salida, cualquier persona que escriba desde su correo personal
  // sería acusada de suplantar una marca. La suplantación desde correo gratuito
  // la detecta `analyzeSender`, que sí mira el nombre visible.
  if (FREEMAIL.has(registrable)) return signals;

  const name = registrable.split('.')[0] ?? '';

  // Typosquatting: "bancolonbia.com", "netflíx.com", "gooogle.com".
  for (const brandDomain of ALL_BRAND_DOMAINS) {
    const distance = levenshtein(registrable, registrableDomain(brandDomain));
    if (distance > 0 && distance <= 2) {
      signals.push({
        id: 'domain.lookalike',
        category: 'domain',
        weight: 35,
        explanation: `El dominio ${registrable} se parece muchísimo a ${brandDomain} pero no es el mismo. Cambiar una o dos letras es la forma más común de suplantar una marca.`,
        evidence: registrable,
      });
      break;
    }
  }

  // Combosquatting: "bancolombia-seguro.com", "verificacion-nequi.net".
  const brandInName = BRANDS.find((brand) =>
    brand.aliases.some((alias) => name.includes(alias)),
  );
  if (brandInName) {
    const hasTrustWord = TRUST_PREFIXES.some((word) => name.includes(word));
    signals.push({
      id: 'domain.brand-combosquatting',
      category: 'domain',
      weight: hasTrustWord ? 30 : 22,
      explanation: `El dominio incluye el nombre "${brandInName.name}" pero no es un dominio oficial de la empresa (los oficiales son ${brandInName.domains.join(', ')}).`,
      evidence: registrable,
    });
  }

  const tld = registrable.split('.').pop() ?? '';
  if (HIGH_RISK_TLDS.has(tld)) {
    signals.push({
      id: 'domain.high-risk-tld',
      category: 'domain',
      weight: 12,
      explanation: `La terminación .${tld} es barata y de registro inmediato, por eso se usa mucho en campañas de fraude.`,
      evidence: registrable,
    });
  }

  if (host.startsWith('xn--') || host.includes('.xn--')) {
    signals.push({
      id: 'domain.punycode',
      category: 'domain',
      weight: 28,
      explanation:
        'El dominio usa caracteres especiales codificados (punycode) que en pantalla se ven como letras normales. Es una técnica para imitar dominios legítimos.',
      evidence: host,
    });
  }

  return signals;
}
