/**
 * Traducción de lo que el motor devuelve en inglés a lo que lee el usuario.
 *
 * Vive en el frontend, y no en las reglas del backend, por tres razones:
 *
 * 1. `Safe`, `Suspicious` y `Malicious` son el contrato de la API y aparecen
 *    así en los casos de prueba del Sprint 1 (#31 a #39). Cambiarlos rompería
 *    a los demás; traducir solo al mostrarlos, no.
 * 2. Los indicadores se guardan en la base (`analysis_results.indicators` y
 *    `quarantine`). Traducir aquí hace que los análisis viejos, guardados en
 *    inglés, también se vean en español.
 * 3. No toca `analysis.service.ts` ni `rules/`, que son de otros integrantes.
 *
 * **El término citado se deja tal cual aparece en el correo.** Si el mensaje
 * dice «password», el indicador tiene que decir «password»: el usuario va a
 * buscar esa palabra en el correo, y traducírsela a «contraseña» lo mandaría a
 * buscar algo que no está escrito.
 *
 * OJO: esto traduce lo que se muestra, no lo que se detecta. Las listas de
 * términos del motor siguen siendo solo en inglés, así que un correo de
 * phishing escrito en español se sigue clasificando como seguro. Está
 * documentado como hallazgo pendiente del equipo.
 */

/** Indicadores con texto fijo, sin término citado. */
const FIJOS: Record<string, string> = {
  "Domain contains multiple hyphens": "El dominio tiene varios guiones",
  "URL uses insecure HTTP": "El enlace no usa conexión segura (HTTP)",
  "URL contains multiple hyphens": "El enlace tiene varios guiones",
};

/** Indicadores que terminan en el término encontrado, que se conserva. */
const CON_TERMINO: { prefijo: string; plantilla: string }[] = [
  {
    prefijo: "Keyword detected: ",
    plantilla: "Palabra sospechosa en el texto",
  },
  {
    prefijo: "Suspicious email term: ",
    plantilla: "Término sospechoso en el remitente",
  },
  {
    prefijo: "Suspicious URL term: ",
    plantilla: "Término sospechoso en el enlace",
  },
];

export function traducirIndicador(indicador: string): string {
  const fijo = FIJOS[indicador];
  if (fijo) return fijo;

  for (const { prefijo, plantilla } of CON_TERMINO) {
    if (indicador.startsWith(prefijo)) {
      return `${plantilla}: «${indicador.slice(prefijo.length)}»`;
    }
  }

  // Si el motor añade un indicador nuevo, se muestra tal cual en vez de
  // ocultarlo: una evidencia en inglés es mejor que ninguna evidencia.
  return indicador;
}

const CATEGORIAS: Record<string, string> = {
  Safe: "Seguro",
  Suspicious: "Sospechoso",
  Malicious: "Malicioso",
};

export function traducirCategoria(categoria: string): string {
  return CATEGORIAS[categoria] ?? categoria;
}

/**
 * El motivo que guarda la cuarentena trae la categoría en inglés incrustada
 * (`backend/src/quarantine/quarantine.service.ts`).
 */
export function traducirMotivo(motivo: string): string {
  return Object.entries(CATEGORIAS).reduce(
    (texto, [ingles, espanol]) =>
      texto.replace(`como ${ingles}`, `como ${espanol.toLowerCase()}`),
    motivo
  );
}
