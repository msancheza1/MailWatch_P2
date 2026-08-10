import type { EmailMessage, Signal } from '../types.js';
import { brandsMentionedIn } from './brands.js';
import { FREEMAIL, domainOf, registrableDomain } from './util.js';

/** RF-02: análisis del remitente. */
export function analyzeSender(email: EmailMessage): Signal[] {
  const signals: Signal[] = [];
  const fromDomain = domainOf(email.from.address);
  const fromRegistrable = registrableDomain(fromDomain);
  const claimedBrands = brandsMentionedIn(email.from.displayName);

  const impersonatedBrand = claimedBrands.find(
    (brand) => !brand.domains.some((d) => registrableDomain(d) === fromRegistrable),
  );

  if (impersonatedBrand) {
    const usingFreemail = FREEMAIL.has(fromRegistrable);
    signals.push({
      id: usingFreemail ? 'sender.freemail-impersonation' : 'sender.display-name-mismatch',
      category: 'sender',
      weight: usingFreemail ? 35 : 30,
      explanation: usingFreemail
        ? `El correo dice ser de ${impersonatedBrand.name}, pero fue enviado desde una cuenta personal gratuita (${fromRegistrable}). Las empresas nunca escriben desde este tipo de cuentas.`
        : `El remitente se presenta como ${impersonatedBrand.name}, pero la dirección real pertenece al dominio ${fromRegistrable}, que no es de esa empresa.`,
      evidence: `${email.from.displayName} <${email.from.address}>`,
    });
  }

  if (email.replyTo) {
    const replyRegistrable = registrableDomain(domainOf(email.replyTo.address));
    if (replyRegistrable && replyRegistrable !== fromRegistrable) {
      signals.push({
        id: 'sender.reply-to-mismatch',
        category: 'sender',
        weight: 20,
        explanation: `Si respondes, tu mensaje no irá al remitente sino a ${email.replyTo.address}. Es una técnica común para desviar la conversación a un atacante.`,
        evidence: `Reply-To: ${email.replyTo.address}`,
      });
    }
  }

  if (!email.authenticatedDomain) {
    signals.push({
      id: 'sender.unauthenticated',
      category: 'sender',
      weight: 15,
      explanation:
        'El correo no está firmado digitalmente (SPF/DKIM), así que no hay forma de comprobar que salió realmente del dominio que dice.',
    });
  } else if (registrableDomain(email.authenticatedDomain) !== fromRegistrable) {
    signals.push({
      id: 'sender.auth-domain-mismatch',
      category: 'sender',
      weight: 25,
      explanation: `La firma del correo corresponde a ${email.authenticatedDomain}, un dominio distinto al que aparece como remitente (${fromRegistrable}).`,
      evidence: `From: ${fromRegistrable} · Firmado por: ${email.authenticatedDomain}`,
    });
  } else if (claimedBrands.length > 0 && !impersonatedBrand) {
    signals.push({
      id: 'sender.verified-brand',
      category: 'sender',
      weight: -12,
      explanation: `El correo está firmado digitalmente por ${email.authenticatedDomain}, el dominio oficial de ${claimedBrands[0]!.name}.`,
    });
  }

  return signals;
}
