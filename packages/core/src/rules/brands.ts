/**
 * Marcas suplantadas con frecuencia y su dominio legítimo.
 *
 * En Sprint 1 esto es una lista local. Cuando entre el servicio de reputación
 * de URL (RF-02, dependencia externa) esta tabla se sustituye por la consulta
 * al proveedor, sin cambiar la firma de las reglas.
 */
export interface Brand {
  name: string;
  /** Cómo aparece la marca en el nombre visible o el asunto. */
  aliases: readonly string[];
  domains: readonly string[];
}

export const BRANDS: readonly Brand[] = [
  { name: 'Bancolombia', aliases: ['bancolombia'], domains: ['bancolombia.com', 'bancolombia.com.co'] },
  { name: 'Nequi', aliases: ['nequi'], domains: ['nequi.com.co'] },
  { name: 'Davivienda', aliases: ['davivienda'], domains: ['davivienda.com'] },
  { name: 'DIAN', aliases: ['dian'], domains: ['dian.gov.co'] },
  { name: 'Google', aliases: ['google', 'gmail'], domains: ['google.com', 'accounts.google.com'] },
  { name: 'Microsoft', aliases: ['microsoft', 'office 365', 'outlook'], domains: ['microsoft.com', 'outlook.com'] },
  { name: 'Netflix', aliases: ['netflix'], domains: ['netflix.com'] },
  { name: 'PayPal', aliases: ['paypal'], domains: ['paypal.com'] },
  { name: 'Rappi', aliases: ['rappi'], domains: ['rappi.com'] },
  { name: 'Amazon', aliases: ['amazon'], domains: ['amazon.com', 'amazon.com.co'] },
];

export const ALL_BRAND_DOMAINS: readonly string[] = BRANDS.flatMap((b) => b.domains);

export function brandsMentionedIn(text: string): Brand[] {
  const haystack = text.toLowerCase();
  return BRANDS.filter((brand) =>
    brand.aliases.some((alias) => haystack.includes(alias)),
  );
}
