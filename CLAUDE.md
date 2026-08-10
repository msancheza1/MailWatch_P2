# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MailWatch es un proyecto universitario (Pontificia Universidad Javeriana, Proyecto 2).
El backlog vive en la [wiki del repo del equipo](https://github.com/msancheza1/MailWatch_P2/wiki/Sprint-0)
y en su [tablero](https://github.com/users/msancheza1/projects/6/views/1). **El estado actual
del desarrollo está en [PROGRESO.md](PROGRESO.md) — léelo antes de empezar** y actualízalo
cuando cierres una historia.

El producto y todo su código (comentarios, identificadores de UI, textos) están en español.
Mantén ese idioma.

## Comandos

```bash
npm install                              # instala todos los workspaces
npm test                                 # corre las pruebas de packages/core
npm run build                            # compila la app de escritorio
npm run typecheck                        # tsc --noEmit en todos los workspaces
npm run dev                              # abre la app Electron (+ servidor en :5173)
npm run dist:win                         # instalador y portable de Windows en apps/desktop/release/

npm run evaluar                          # reporte de calidad del detector (métricas + errores)

npm test --workspace @mailwatch/core -- -t "US-03"    # un solo bloque de pruebas
cd packages/core && npx vitest                        # modo watch
```

**`npm run dev` falla desde una terminal de VS Code / Antigravity** con
`Cannot read properties of undefined (reading 'whenReady')`: el IDE exporta
`ELECTRON_RUN_AS_NODE=1` y Electron arranca como Node en vez de como app.
Corre `unset ELECTRON_RUN_AS_NODE` primero.

Para trabajar solo en la interfaz no hace falta Electron: `npm run dev` deja el renderer
en <http://localhost:5173> y ahí el análisis se calcula en el propio renderer
(`apps/desktop/src/renderer/src/lib/inbox.ts` detecta la ausencia de `window.mailwatch`).

## Arquitectura

Monorepo con npm workspaces, tres piezas:

| Paquete | Rol |
|---|---|
| `packages/core` | Modelo de dominio, motor de reglas, explicaciones, cuarentena. TypeScript puro: sin Electron, sin React, sin red. |
| `packages/fixtures` | Dataset simulado de 48 correos con etiqueta esperada (`groundTruth`). |
| `apps/desktop` | Electron + React 19 + Vite. Cuatro pantallas: Dashboard, Bandeja, Cuarentena, Configuración. |

La interfaz sigue los mockups de Figma del equipo: fondo lavanda `#eef0fd`, barra lateral
carbón `#2b2622`, acento menta `#86efac`, tarjetas de color plano y tipografía Plus Jakarta
Sans. Los tokens están en `styles.css`; **no introduzcas colores fuera de ellos**. El diseño
es de un solo tema claro a propósito — no agregues modo oscuro sin que el equipo lo diseñe.

Ninguna cifra de la interfaz es inventada: el «nivel de protección» del panel sale de
`evaluate()` sobre el dataset etiquetado. Si necesitas un número nuevo en pantalla,
calcúlalo de los datos reales en vez de escribirlo a mano.

**La superficie principal del producto será una extensión de Chrome dentro de Gmail**
(decidido el 10/08/2026, ver PROGRESO.md). `apps/desktop` se reorienta a panel de
administrador. `packages/core` sirve a las dos sin cambios: es la razón de que no dependa
de Electron ni de React.

### Costuras deliberadas

Dos límites artificiales existen para que el sistema real del Sprint 0 (API REST + Gmail)
entre sin reescribir nada. **No los cortocircuites.**

1. **La UI nunca llama a `@mailwatch/core` para obtener la bandeja.** Pide los datos por
   IPC (`inbox:load`, definido en `apps/desktop/src/main/index.ts` y expuesto en
   `src/preload/index.ts`). Ese canal se reemplaza luego por `fetch` contra la API.
   El tipo `InboxSnapshot` es el contrato; vive duplicado a propósito en el main y en
   `src/renderer/src/env.d.ts`.
2. **`loadSimulatedEmails()` de `packages/fixtures` es el único punto que produce correos.**
   Se reemplaza por el conector de Gmail (RF-12) sin tocar el motor. Por eso
   `EmailMessage` es un subconjunto de lo que devuelve `users.messages.get`.

El renderer sí importa `@mailwatch/core` para tipos, `folderFor`, `auditEntry` y
`recommendedAction` — funciones puras de presentación, no acceso a datos.

### Motor de clasificación

`packages/core/src/engine.ts` solo orquesta: ejecuta cinco reglas independientes
(`src/rules/{sender,domain,links,attachments,content}.ts`), combina sus pesos y compara
contra dos umbrales. Cada regla recibe un `EmailMessage` y devuelve `Signal[]`.

Para añadir detección **no toques el motor**: agrega o modifica una regla. Cada `Signal`
lleva su peso, su explicación en lenguaje natural y la evidencia citada del correo —
los tres campos son obligatorios porque la explicabilidad es el diferenciador del
producto frente a los filtros de Gmail (RF-04), no un extra.

Dos detalles del cálculo que no son obvios:

- **Decaimiento por correlación** (`CORRELATION_DECAY`): dentro de una misma categoría,
  la segunda señal aporta el 60 %, la tercera el 36 %, etc. Un dominio falso dispara tres
  reglas de dominio a la vez y sería la misma evidencia contada tres veces. Las señales
  protectoras (peso negativo, p. ej. `sender.verified-brand`) suman completas.
- **Las listas de dominios del usuario deciden, no puntúan.** `AnalyzeOptions.policy` fuerza
  el nivel a seguro o malicioso y añade una señal de peso 0; el puntaje se sigue calculando
  pero deja de ser el operativo. La interfaz oculta el medidor en ese caso (`decidedByPolicy`).
- **Los términos de `content.ts` se escriben con tildes** porque se muestran tal cual en
  la explicación al usuario; `countMatches` normaliza ambos lados antes de comparar.

### El dataset es la suite de aceptación

`packages/fixtures/src/emails.json` trae `groundTruth` en cada correo y
`packages/core/test/dataset.test.ts` verifica que el motor acierta los 48, que ningún
correo legítimo cae en «malicioso» y que la sensibilidad Alta marca más que la Baja.

Al cambiar pesos o umbrales, corre `npm test` y `npm run evaluar` antes de dar nada por
bueno. El segundo mide la clasificación como decisión binaria y lista uno por uno los
correos en los que se equivoca; `packages/core/src/evaluate.ts` tiene las métricas. Si un caso
falla, la respuesta correcta casi siempre es ajustar la regla o agregar un correo
representativo al dataset — **no reetiquetar el caso para que pase**. El dataset necesita
casos de zona gris (puntaje 20-45); sin ellos las pruebas de sensibilidad no distinguen
presets.

Un dataset que el motor acierta al 100 % **no** demuestra que el motor sirva, porque las
reglas y los correos se escribieron juntos. La forma de aportar evidencia real es agregar
casos adversariales: legítimos que disparen las heurísticas (avisos de código de un solo
uso, marketing con urgencia, adjuntos comprimidos de un compañero) y fraude que las
esquive (sin enlaces, sin adjuntos, en inglés, desde un dominio legítimo comprometido).
Los casos `sim-033` en adelante son de ese tipo y encontraron cuatro fallos reales.

Editar `emails.json` no requiere saber programar: es la vía para que el PO y la SM
agreguen casos reales anonimizados.

## Windows es la plataforma objetivo

El desarrollo se ha hecho en macOS pero **el destino es Windows de 64 bits**. Todo lo
específico de plataforma está aislado en `windowChrome()` (`src/main/index.ts`):

- **Windows** usa ventana sin marco con `titleBarOverlay`, para que se vea como los mockups
  en vez de llevar la barra de título gris del sistema. Los botones de la ventana quedan
  sobre la esquina superior derecha del lienzo, así que `body[data-platform='win32']` reserva
  56 px de relleno superior y `.window-drag` da una franja para arrastrar. **Sin eso, el
  botón «Vaciar cuarentena» queda debajo del botón de cerrar.**
- **macOS** usa `hiddenInset` con los semáforos sobre la barra lateral.

Al agregar cualquier control en la esquina superior derecha de una pantalla, compruébalo en
Windows: es la zona que ocupan los botones de la ventana.

`electron-builder.yml` fija `electronVersion` a propósito — un rango no le sirve porque
descarga binarios de una versión concreta. El icono vive en `apps/desktop/build/icon.ico`
y sí se versiona, pese a que `.gitignore` excluye los `build/` en general.

## Configuración del build que rompe si se toca

- `apps/desktop` **no** lleva `"type": "module"`: main y preload se emiten como CommonJS
  porque el módulo `electron` es CJS. Por eso el main usa `__dirname`, no `import.meta.dirname`.
- `@mailwatch/core` y `@mailwatch/fixtures` están en `devDependencies` de `apps/desktop`, no
  en `dependencies`: electron-vite externaliza automáticamente las `dependencies` del main,
  y como estos paquetes se publican sin compilar, Electron intentaría cargar `.ts` en
  runtime. Además `electron.vite.config.ts` los aliasa directo al código fuente.
