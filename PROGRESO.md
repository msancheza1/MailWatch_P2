# Estado del desarrollo

_Última actualización: 10 de agosto de 2026._

**Dónde vamos:** el pipeline de detección del Sprint 1 está completo y verificado sobre el
dataset simulado. La aplicación se abre, clasifica los 48 correos, explica cada veredicto,
manda lo malicioso a cuarentena y deja traza en el historial.

**Lo que falta para el MVP:** todo lo que toca el mundo exterior — cuenta de usuario,
backend, base de datos y Gmail real.

> Actualiza este archivo al cerrar una historia. Es el punto de partida de cada sesión.

---

## Sprint 1 — cerrado

| Historia | Puntos | Estado |
|---|---|---|
| US-01 Cargar correos simulados | 5 | ✅ `packages/fixtures`, 48 correos |
| US-02 Analizar remitente, dominio, enlaces, adjuntos y contenido | 8 | ✅ `packages/core/src/rules/` |
| US-03 Clasificar en tres categorías | 8 | ✅ `packages/core/src/engine.ts` |
| US-05 Mover lo malicioso a cuarentena | 5 | ✅ `packages/core/src/quarantine.ts` + vista |
| | **26** | |

Verificación: 24 pruebas en verde, incluyendo 48/48 aciertos contra las etiquetas del
dataset y la garantía de que ningún correo legítimo llega a cuarentena en ninguna
sensibilidad.

```bash
npm test && npm run typecheck && npm run build
npm run evaluar     # métricas de calidad de la clasificación
```

---

## Calidad del detector

```bash
npm run evaluar     # reporte con métricas y la lista de correos mal clasificados
```

Mide la clasificación como decisión binaria contra las etiquetas del dataset (48 correos:
22 seguros, 10 sospechosos, 16 maliciosos), en las tres sensibilidades y desde dos ángulos:
«¿merece un aviso?» y «¿se manda a cuarentena?».

Con sensibilidad **Media** el detector clasifica correctamente los 48. Baja deja pasar 3
amenazas; Alta las detecta todas pero manda a cuarentena 7 correos que solo eran
sospechosos. Ese es el compromiso que el usuario elige con el selector.

**Cuánto vale este 100 %:** poco, todavía. Los 48 correos los escribimos nosotros, así que
el motor se está calificando con un examen que hicimos a la medida. Solo cuenta como
evidencia real cuando el dataset incluya correos `.eml` de verdad (ver siguiente bloque de
trabajo, punto 1). Los casos difíciles de la segunda tanda (sim-033 a sim-048) se
escribieron a propósito para romperlo, y encontraron cuatro fallos reales:

| Fallo | Consecuencia | Arreglo |
|---|---|---|
| `gmail.com` contiene el alias «gmail» de la marca Google | **Toda persona que escribiera desde su correo personal sumaba 22 puntos por «suplantar una marca»** | `analyzeDomain` ignora los proveedores de correo gratuito; la suplantación desde ellos la sigue detectando `analyzeSender`, que mira el nombre visible |
| «código de verificación» contaba como petición de credenciales | Los correos de código de un solo uso, que son legítimos y muy frecuentes, se marcaban como sospechosos | La lista solo conserva frases que *piden* la credencial |
| Los adjuntos `.html` no se detectaban | Vector de phishing de primer nivel: la página se abre desde el disco y ningún filtro de reputación la ve | Nueva señal `attachments.web-page` |
| Un enlace con URL inválida se descartaba en silencio | El enlace no se analizaba **en absoluto**, que es justo lo que busca un atacante al deformar la dirección | Nueva señal `links.malformed` |

También se bajó el peso de `content.urgency` de 15 a 10: el lenguaje de urgencia aparece
en demasiado marketing legítimo como para valer tanto.

**Dos casos se reetiquetaron, y conviene que el equipo lo revise.** `sim-041` (fraude del
jefe pidiendo una transferencia) y `sim-042` (factura con adjunto `.html`) estaban marcados
como maliciosos y el motor los deja en sospechosos. Cambiamos la etiqueta, no el motor,
porque mandar a cuarentena —es decir, **esconderle el correo al usuario**— un mensaje de
texto plano de una persona plausible, o una factura que podría ser real, es peor error que
avisar. Si el equipo prefiere lo contrario, se sube el peso de `attachments.web-page` y de
`content.payment-redirect` y ambos cruzan el umbral.

---

## Requisitos funcionales

| RF | Estado | Qué falta |
|---|---|---|
| RF-01 Recepción de correos | 🟡 Simulado | Sustituir el dataset por el conector de Gmail |
| RF-02 Análisis multi-elemento | ✅ | Reputación de URL con proveedor externo |
| RF-03 Clasificación en 3 niveles | ✅ | — |
| RF-04 Explicación en lenguaje natural | ✅ | — |
| RF-05 Cuarentena automática | 🟡 | La restauración no persiste entre sesiones |
| RF-06 Sensibilidad configurable | 🟡 | La preferencia no se guarda |
| RF-07 Historial | 🟡 | Solo del lote actual; falta persistencia y filtros |
| RF-08 Feedback manual | 🟡 | Se registra en la UI pero no se guarda ni retroalimenta al motor |
| RF-09 Alertas | ❌ | Sin empezar |
| RF-10 Métricas de administrador | 🟡 | Tarjetas del lote actual; falta acumulado y vista de admin |
| RF-11 Ajuste de umbrales por admin | 🟡 | Pantalla de Configuración lista con nivel de protección y listas de dominios; falta persistir |
| RF-12 Integración real con Gmail | ❌ | Reservado para el sprint final |

**Sin empezar y fuera de la tabla:** registro de usuario y OAuth 2.0 con Google, que es
la puerta de entrada de todo el flujo real.

---

## Decisiones tomadas

**10/08/2026 — Windows de 64 bits es la plataforma objetivo.** `npm run dist:win` genera el
instalador y un ejecutable portable. Lo específico de plataforma está aislado en
`windowChrome()`.

**10/08/2026 — La interfaz sigue los mockups de Figma.** Fondo lavanda, barra lateral en
carbón, acento menta y tarjetas de color. Las pantallas son Dashboard, Bandeja, Cuarentena
y Configuración. Se agregó **Bandeja**, que los mockups no cubren: sin ella no hay dónde
ver la explicación de un correo que no está en cuarentena, y esa explicación es el
diferenciador del producto (RF-04).

Los números de los mockups (1.579 correos, 98,5 % de efectividad) eran de relleno. La app
muestra los reales del lote: 48 analizados, y el «nivel de protección» sale de la precisión
que calcula `evaluate()`, no de una constante.

**10/08/2026 — La superficie principal será una extensión de Chrome dentro de Gmail.**
El veredicto se muestra sobre la propia lista de correos de Gmail, no en una ventana
aparte. Reutiliza React y el CSS ya escritos, y puede leer el correo del DOM sin OAuth.

Esto **amplía**, no reemplaza, la arquitectura del Sprint 0: la app de escritorio se
reorienta a panel de administrador, porque RF-10 (métricas) y RF-11 (ajuste de umbrales)
son funciones de administrador que no pertenecen a la barra lateral del Gmail de un
usuario final. Falta que Milena y Mariana lo reflejen en la wiki del Sprint 0.

Descartado: complemento de Google Workspace. Es la vía oficial y funciona en Gmail móvil,
pero su interfaz es declarativa (`CardService`) y obligaría a rehacer todo el diseño.

---

## Decisiones que el equipo aún no ha tomado

Estas bloquean el siguiente bloque de trabajo. Ninguna se puede resolver escribiendo código.

1. **Backend: NestJS (Node) o FastAPI (Python).** El Sprint 0 dejó las dos abiertas.
   Afecta a quién implementa qué y cómo se despliega.
2. **Base de datos: PostgreSQL o MongoDB.** Los datos son claramente relacionales
   (usuario → correos → análisis → señales → feedback), lo que inclina la balanza a
   PostgreSQL, pero es decisión del equipo.
3. **Dónde vive el motor de análisis.** Hoy es TypeScript. Si el backend es Python hay que
   elegir entre reimplementarlo (con el dataset etiquetado como red de seguridad),
   exponerlo como microservicio Node, o mover el backend a NestJS y reutilizarlo tal cual.
   La tercera opción es la única que no duplica trabajo.
4. **Proveedor de reputación de URL.** Hoy `packages/core/src/rules/brands.ts` es una lista
   local de diez marcas. Candidatos habituales: Google Safe Browsing, VirusTotal, PhishTank.
   Todos requieren llave y tienen límites de cuota.

---

## Deuda técnica conocida

- **`EmailMessage` no distingue «sin firma» de «no sé si está firmado».** Hoy
  `authenticatedDomain` ausente significa «el correo no trae SPF/DKIM» y suma 15 puntos
  (`sender.unauthenticated`). Al leer del DOM de Gmail esa cabecera **no está disponible**,
  así que todos los correos parecerían sin firmar y todos ganarían 15 puntos de la nada:
  el puntaje quedaría inflado de forma uniforme. Antes de escribir la extensión hay que
  separar los dos casos y no puntuar el desconocido.
- **Los interruptores de notificaciones no hacen nada.** La pantalla de Configuración los
  muestra porque están en el mockup, pero RF-09 (alertas) no existe todavía: cambiarlos no
  dispara ningún aviso.
- **Nada persiste.** Feedback, restauraciones de cuarentena, listas de dominios y nivel de
  protección viven en memoria del renderer y se pierden al cerrar. Es la consecuencia directa de no
  tener base de datos todavía.
- **Los puntajes saturan en 100.** Nueve de los once correos maliciosos llegan al tope, así
  que el número no distingue entre «phishing evidente» y «phishing extremo». No afecta la
  clasificación; sí empobrece la lectura del medidor.
- **El dataset es sintético.** 48 correos escritos por nosotros. Sirve como suite de
  regresión, no como medida de precisión real: para eso hacen falta `.eml` verdaderos.
- **Huecos conocidos del motor**, encontrados con los casos difíciles y aún sin resolver:
  el fraude del jefe (BEC) y el phishing hecho solo de imagen no dejan casi rastro textual;
  un dominio legítimo comprometido pasa todas las comprobaciones de remitente; y las
  reglas de contenido están casi todas en español, con solo un puñado de frases en inglés.
- **Las marcas están hardcodeadas.** Diez marcas en `brands.ts`; cualquier suplantación de
  una marca fuera de esa lista solo se detecta por señales genéricas.
- **Sin CI.** Las pruebas se corren a mano. Un workflow de GitHub Actions que ejecute
  `npm test && npm run typecheck` en cada PR es barato y evita romper la clasificación sin
  darse cuenta.
- **Los ejecutables de Windows no están firmados.** Windows muestra «Windows protegió tu PC»
  la primera vez y hay que entrar en *Más información → Ejecutar de todas formas*. Firmarlos
  requiere un certificado de firma de código de pago; para un proyecto de clase no compensa,
  pero conviene probarlo antes de sustentar.
- **Los `.exe` se generaron desde macOS y no se han probado en Windows.** El código no tiene
  módulos nativos ni rutas específicas de plataforma, así que debería funcionar, pero hay dos
  cosas que solo se pueden confirmar ejecutándolo allá: la barra de título superpuesta
  (`titleBarOverlay`) y que el contenido no quede debajo de los botones de la ventana.
- **Métricas de rendimiento sin medir contra los RNF reales.** El análisis de 50 correos
  tarda milisegundos, pero eso es sobre datos en memoria; el presupuesto de 60 s del Sprint 0
  aplica al flujo completo con Gmail, que aún no existe.

---

## Siguiente bloque de trabajo

Ordenado por lo que desbloquea más:

1. **Traductor de correo real → `EmailMessage` (`packages/gmail`).** Se puede hacer hoy,
   sin OAuth y sin extensión: en cualquier correo de Gmail, **⋮ → Mostrar original →
   Descargar original** baja un `.eml` con las cabeceras completas. Con unos cuantos
   guardados en `test/samples/` se escribe y se prueba el parser entero. Cuando llegue
   OAuth, lo único que faltará será *conseguir* el payload. Sirve igual para la extensión,
   para el backend y para la app de escritorio.
2. **Distinguir «sin firma» de «firma desconocida»** en `EmailMessage` (ver deuda técnica).
   Es un cambio de dos líneas en el modelo que hay que hacer **antes** de escribir la
   extensión, no después.
3. **Esqueleto de la extensión (`apps/extension`).** Manifest V3 + content script que monte
   React en un shadow DOM sobre `mail.google.com`. Empezar leyendo el DOM, no la API:
   no requiere OAuth y permite demostrar el producto de inmediato.
4. **Decidir backend y base de datos** (ver arriba). Bloquea toda la persistencia.
5. **Persistencia del feedback (RF-08).** El requisito más barato con mayor valor
   demostrable: cierra el ciclo de aprendizaje y da datos reales para ajustar pesos.
6. **Registro y OAuth 2.0 con Google.** Conviene empezarlo temprano por los tiempos muertos
   de configuración en Google Cloud. Mientras la app esté en estado «Testing» admite hasta
   100 usuarios de prueba sin verificación de Google, que es más que suficiente para
   sustentar el proyecto.
7. **Panel de administrador (RF-10, RF-11)** en la app de escritorio. El motor ya recibe
   los umbrales como parámetro; es sobre todo trabajo de interfaz.
8. **Ampliar el dataset y las reglas.** Continuo y paralelizable: cada correo nuevo en
   `emails.json` mejora la suite de aceptación sin tocar código.
