# MailWatch

Aplicación de escritorio que analiza correos y explica, en lenguaje natural, por qué
un mensaje es seguro, sospechoso o malicioso. La interfaz sigue los mockups de Figma
del equipo.

Este repositorio arranca donde termina el [Sprint 0](https://github.com/msancheza1/MailWatch_P2/wiki/Sprint-0):
implementa el **pipeline de detección completo sobre el dataset simulado**, que es el
objetivo del Sprint 1 (US-01, US-02, US-03 y US-05).

---

## Instalar la aplicación

**Requisitos:** Windows 10 u 11 de 64 bits. No hace falta instalar nada más: la aplicación
trae todo dentro y funciona sin conexión.

1. Entra a la sección **[Releases](../../releases)** de este repositorio.
2. En la última versión hay dos archivos `.exe`. Descarga uno:
   - El que dice **`portable`** — se ejecuta con doble clic, sin instalar nada. Es la
     opción recomendada: cabe en una USB y funciona en cualquier equipo.
   - El que dice **`Setup`** — instalador con asistente, si prefieres dejarla instalada
     con acceso directo en el escritorio.
3. Ábrelo con doble clic.

> **La primera vez Windows va a mostrar «Windows protegió tu PC».** Es normal y no
> significa que el archivo esté infectado: aparece porque el ejecutable no está firmado con
> un certificado de pago. Haz clic en **Más información** y luego en **Ejecutar de todas
> formas**.

La aplicación abre directamente con el lote de correos de prueba cargado. No pide cuenta ni
contraseña porque todavía no se conecta a Gmail: analiza un dataset simulado que viaja
dentro del programa.

### Desinstalar

Si usaste el portable, basta con borrar el archivo. Si usaste el instalador, se quita desde
**Configuración → Aplicaciones → MailWatch → Desinstalar**.

---

## Trabajar en el código

**Requisitos:** [Node.js](https://nodejs.org) 20 o superior y Git.

```bash
git clone <url-del-repositorio>
cd MailWatch
npm install          # una sola vez

npm run dev          # abre la app en modo desarrollo
npm test             # pruebas del motor de clasificación
npm run evaluar      # reporte de calidad: métricas y correos mal clasificados
npm run dist:win     # genera el instalador y el portable en apps/desktop/release/
```

Para trabajar solo en la interfaz sin abrir Electron: `npm run dev` deja además un
servidor en <http://localhost:5173>. El renderer detecta que no está dentro de
Electron y calcula el análisis localmente, así que la UI funciona igual en el navegador.

> **macOS + VS Code / IDEs basados en Electron:** si `npm run dev` falla con
> `Cannot read properties of undefined (reading 'whenReady')`, la terminal heredó la
> variable `ELECTRON_RUN_AS_NODE=1` del IDE. Solución: `unset ELECTRON_RUN_AS_NODE`
> antes de correr, o usar la terminal del sistema.

### Publicar una versión nueva

Los ejecutables **no se suben al repositorio**: pesan 95 MB cada uno y GitHub rechaza
archivos de más de 100 MB. Van en Releases:

1. `npm run dist:win`
2. En GitHub: **Releases → Draft a new release**, crea una etiqueta (`v0.1.0`).
3. Arrastra los dos `.exe` de `apps/desktop/release/` y publica.

El enlace de descarga del README apunta solo a `Releases`, así que no hay que actualizarlo
en cada versión.

---

## Estructura

```
packages/core       Modelo de dominio + motor de reglas + explicaciones  (Sprint 1: RF-02 a RF-06)
packages/fixtures   Dataset simulado de 48 correos etiquetados            (Sprint 1: US-01)
apps/desktop        App Electron + React: panel, bandeja, cuarentena, ajustes (Sprint 1: UI)
```

`packages/core` no depende de Electron, de React ni de la red: es TypeScript puro.
Eso permite probarlo con `vitest` sin levantar nada y, más adelante, moverlo detrás
de la API REST sin reescribirlo.

---

## Decisiones que vale la pena conocer

**El proceso principal de Electron hace hoy el papel del backend.** La UI nunca llama
al motor directamente: pide los datos por IPC (`inbox:load`). Cuando exista la API REST
del Sprint 0, se cambia esa llamada por un `fetch` y el renderer no se entera. Ese
límite artificial es intencional.

**El puntaje es aditivo y auditable, no un modelo entrenado.** Cada regla aporta puntos
con una explicación asociada; el puntaje es la suma, y la clasificación sale de comparar
contra dos umbrales configurables. Se eligió así porque la explicabilidad es el
diferenciador del producto frente a los filtros de Gmail: cada punto del riesgo se puede
señalar en el correo. Un clasificador estadístico se puede añadir después como una
regla más.

**Señales de la misma categoría no se suman en línea recta.** Un dominio falso dispara
varias reglas a la vez (typosquatting, TLD sospechoso, marca en el nombre) y sería la
misma evidencia contada tres veces. Dentro de cada categoría la segunda señal aporta el
60 %, la tercera el 36 %, y así (`CORRELATION_DECAY` en `packages/core/src/engine.ts`).

**El dataset trae la etiqueta esperada.** Cada correo de `packages/fixtures` incluye
`groundTruth`, y una prueba verifica que el motor acierta los 48. Es la red de seguridad
para tocar pesos sin romper la clasificación: si alguien ajusta una regla y rompe otro
caso, el test lo dice.

---

## Estado

El detalle de qué requisito está cubierto, qué falta y qué decisiones siguen abiertas
está en **[PROGRESO.md](PROGRESO.md)**, que se actualiza al cerrar cada historia.

En resumen: el Sprint 1 está cerrado (US-01, US-02, US-03, US-05) y lo que falta es todo
lo que toca el mundo exterior — cuenta de usuario, backend, base de datos y Gmail real.
Eso vive detrás de dos costuras ya preparadas: `loadSimulatedEmails()` (se cambia por el
conector de Gmail) y el canal IPC `inbox:load` (se cambia por la API).

---

## Siguientes pasos sugeridos por rol

- **Backend (Samuel):** levantar la API REST con el mismo contrato de `InboxSnapshot` y
  mover `analyzeBatch` detrás de un endpoint. El motor ya es portable.
- **AI/ML (Juan José):** ampliar reglas y pesos en `packages/core/src/rules/`. Cada cambio
  se valida corriendo `npm test`; el dataset etiquetado es el banco de pruebas.
- **Frontend (Helen, Juan Esteban):** pantallas que faltan (registro, ajustes, panel de
  administrador) y conectar el feedback de RF-08 con persistencia real.
- **PO / SM (Milena, Mariana):** el dataset de `packages/fixtures/src/emails.json` es
  editable sin programar; agregar casos reales anonimizados mejora directamente las
  pruebas de aceptación.
