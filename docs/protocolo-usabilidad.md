# Protocolo de pruebas de usabilidad — MailWatch

**Responsable:** Juan Esteban Martínez (JuanMartinez1906)
**Estado:** planeado en el Sprint 2. **Se ejecuta en el Sprint 3.**
**Versión:** 1.0 — 21 de octubre de 2026

Este documento define cómo se van a medir las pruebas, no sus resultados. Las tablas
de registro están vacías a propósito: se llenan durante las sesiones del Sprint 3.

---

## 1. Objetivo

Comprobar si una persona sin conocimientos de seguridad informática puede, usando
MailWatch, **decidir correctamente qué hacer con un correo** —abrirlo, desconfiar o no
tocarlo— y si entiende por qué el sistema lo clasificó así.

La distinción importa. Un usuario puede completar todas las tareas de la interfaz y aun
así caer en el phishing, porque la medida de éxito de un producto de seguridad no es que
sepa navegar: es que **tome la decisión correcta**. Por eso cada tarea mide dos cosas
separadas: si logró operar la aplicación y si acertó en la decisión.

---

## 2. Preguntas de investigación

| # | Pregunta |
|---|---|
| PI-1 | ¿Entiende el usuario qué significa que un correo sea «Malicious», «Suspicious» o «Safe» sin que se lo expliquen? |
| PI-2 | ¿Le sirve la explicación de indicadores (RF-04) o la ignora? |
| PI-3 | ¿La alerta de riesgo alto (US-09) cambia lo que el usuario hace, o solo la cierra? |
| PI-4 | ¿Sigue la acción recomendada, o hace lo contrario de lo que dice? |
| PI-5 | ¿Confía de más? Es decir, ¿acepta como seguro un correo peligroso solo porque MailWatch no lo marcó? |
| PI-6 | ¿Encuentra la cuarentena y entiende que el correo no se borró? |

PI-5 es la más incómoda y la más importante: mide si el producto, al dar una sensación
de protección, vuelve al usuario **menos** cuidadoso que antes.

---

## 3. Hipótesis

| # | Hipótesis | Cómo se confirma o se descarta |
|---|---|---|
| H-1 | Al menos 4 de 5 participantes identifican correctamente el correo de riesgo alto sin ayuda. | Tarea T-2, tasa de éxito ≥ 80 % |
| H-2 | La acción recomendada se sigue más que la explicación técnica: los participantes actúan sobre ella y apenas leen la lista de indicadores. | Observación en T-2 y T-3 + pregunta posterior |
| H-3 | Los términos «Malicious», «Suspicious» y «Safe» en inglés confunden a parte de los participantes. | T-1, errores de interpretación |
| H-4 | Al menos 1 de 5 participantes abre el correo seguro sin revisarlo, confiando solo en la etiqueta verde. | Tarea T-4, conducta observada |
| H-5 | Los participantes no entienden que la cuarentena es simulada y creen que se modificó su Gmail. | T-5, pregunta directa |

Las hipótesis están escritas para poder **fallar**. Si todas se confirman no se aprende
nada; el valor está en las que se caigan.

---

## 4. Perfil de los participantes

**Cuántos: 5.** Con cinco usuarios se detecta alrededor del 80 % de los problemas de
usabilidad, y a partir de ahí los hallazgos se repiten. Para un sprint de clase es el
punto donde el esfuerzo deja de pagar.

| Criterio | Requisito |
|---|---|
| Edad | 18 a 60 años |
| Uso de correo | Usa correo electrónico al menos una vez al día |
| Conocimiento técnico | **Sin** formación en seguridad informática ni desarrollo de software |
| Experiencia previa | No ha visto MailWatch antes ni participó en su diseño |
| Idioma | Español |

**Exclusión explícita:** ningún integrante del equipo, ni estudiantes de Ingeniería de
Sistemas de semestres avanzados. Conocen el producto o el dominio y sus resultados no
representan al usuario objetivo.

**Deseable:** que al menos 2 de los 5 hayan recibido un intento de phishing real alguna
vez. Se pregunta en el cuestionario previo, no se usa como filtro.

---

## 5. Condiciones previas

Todo esto debe estar listo **antes** de que llegue el participante. Si algo falla, la
sesión se reprograma: no se hace depuración delante del usuario.

**Técnicas**

- [ ] Postgres levantado (`docker compose up -d`) y migraciones aplicadas (`npm run db:migrate` en `backend/`).
- [ ] Backend corriendo (`npm run start:dev` en `backend/`).
- [ ] Frontend corriendo (`npm run dev` en `frontend/`).
- [ ] Dataset de prueba cargado **una sola vez** desde «Cargar dataset de prueba». Cada clic añade una copia y duplicaría los correos.
- [ ] Base de datos restaurada al estado inicial entre participante y participante, para que todos vean lo mismo.
- [ ] Identificados de antemano los `id` de los correos que se usan en cada tarea, y verificado que el motor los clasifica como espera el guion.

**De la sesión**

- [ ] Consentimiento informado firmado (grabación de pantalla y voz, uso académico, datos anónimos).
- [ ] Grabación de pantalla y audio configurada. No se graba la cara.
- [ ] Dos personas: un facilitador que habla y un observador que anota. El observador no interviene.
- [ ] Cronómetro listo, uno por tarea.
- [ ] Plantillas de registro de la sección 9 impresas o abiertas.

**Duración estimada:** 35 a 45 minutos por participante.

---

## 6. Guion del facilitador

El guion existe para que los cinco participantes reciban exactamente las mismas palabras.
Cambiar la formulación entre sesiones invalida la comparación.

**Bienvenida (2 min)**

> Gracias por venir. Vamos a probar una aplicación que revisa correos y avisa si parecen
> peligrosos. Quiero dejar algo claro: **no te estamos evaluando a ti, estamos evaluando
> la aplicación.** Si algo te confunde, es un problema nuestro, no tuyo, y justamente eso
> es lo que necesitamos encontrar.
>
> Te voy a pedir que pienses en voz alta: di lo que estás mirando, lo que esperas que
> pase y lo que te sorprende. Si te quedas callado te lo voy a recordar.
>
> No te voy a poder ayudar mientras haces las tareas, aunque te trabes. Eso también es
> parte de la prueba. Vamos a grabar la pantalla y tu voz, no tu cara, y los datos son
> anónimos. ¿Lo autorizas?

**Reglas para el facilitador**

- No usar las palabras «alerta», «cuarentena», «analizar», «riesgo» ni «clasificación»
  al enunciar las tareas. Son justamente los términos cuya comprensión se está midiendo.
- Ante una pregunta del participante, devolverla: *«¿Qué esperarías que pasara?»*.
- No confirmar aciertos ni corregir errores durante la tarea. Ni «muy bien» ni «ahí no».
- Si el participante se bloquea más de 3 minutos, se marca la tarea como fallida, se le
  da la pista mínima y se continúa. Se anota que hubo pista.

**Cierre (5 min)** — preguntas abiertas de la sección 10.

---

## 7. Tareas

Las tareas están escritas como situaciones, no como instrucciones de la interfaz. Decir
«analiza el correo #12» le regala al participante el nombre del botón y la respuesta; lo
que se quiere observar es si llega solo.

El orden es fijo salvo T-3 y T-4, que se alternan entre participantes para que el
cansancio y el aprendizaje no caigan siempre sobre la misma tarea.

---

### T-1 · Primera impresión (sin tocar nada)

> «Esta es la pantalla principal. Antes de hacer nada, cuéntame: ¿qué crees que hace esta
> aplicación y qué te dice esta pantalla?»

- **Qué se observa:** vocabulario espontáneo, qué mira primero, si entiende las cuatro
  tarjetas de arriba, si interpreta «Nivel de protección».
- **Éxito:** describe la función del producto sin ayuda.
- **Tiempo:** máximo 3 minutos. No se cronometra para comparar, se usa como límite.
- **Relacionada con:** PI-1, H-3.

---

### T-2 · El correo peligroso

> «Te llegó este correo que dice ser de tu banco y te pide confirmar tu cuenta. No sabes
> si es de verdad. Usa la aplicación para averiguarlo y dime qué vas a hacer con él.»

- **Qué se observa:** si encuentra el botón de análisis, si lee la alerta o la cierra, si
  lee los indicadores, qué decisión declara.
- **Éxito (operativo):** obtiene la clasificación del correo.
- **Éxito (decisión):** dice que **no** va a abrir enlaces, responder ni descargar adjuntos.
- **Errores típicos a marcar:** cierra la alerta sin leerla; dice que abriría el enlace
  «para confirmar»; busca el resultado en otra pantalla.
- **Tiempo objetivo:** menos de 60 segundos hasta ver la alerta.
- **Relacionada con:** PI-1, PI-3, PI-4, H-1, H-2. **Corresponde al caso CP-US09-01 (issue #36).**

---

### T-3 · Por qué

> «La aplicación tomó una decisión sobre ese correo. ¿Por qué crees que la tomó? ¿Estás
> de acuerdo?»

- **Qué se observa:** si encuentra la lista de indicadores sin ayuda, si los entiende, si
  le resultan convincentes o le parecen palabrería.
- **Éxito:** menciona al menos un indicador concreto del correo, no una generalidad.
- **Riesgo conocido:** hoy los indicadores se muestran en inglés («Keyword detected:
  password»). Se espera que sea un hallazgo repetido; anotarlo literalmente cuando ocurra.
- **Relacionada con:** PI-2, H-2.

---

### T-4 · El correo inofensivo

> «Te llegó este otro correo, de una compañera de trabajo, con un documento adjunto.
> ¿Qué haces?»

- **Qué se observa:** si lo revisa o confía de una vez en el color verde; si la ausencia
  de alerta se lee como «es seguro» o como «todavía no lo he revisado».
- **Éxito (decisión):** lo trata como razonablemente seguro **después** de comprobarlo,
  no antes.
- **Error grave a marcar:** lo da por bueno sin analizarlo, solo porque la pantalla está
  tranquila. Es la confianza excesiva de PI-5.
- **Relacionada con:** PI-5, H-4.

---

### T-5 · ¿Dónde quedó el correo?

> «El correo del banco ya no aparece en la lista de arriba. ¿Dónde está y qué le pasó?
> Si resultara que sí era de verdad, ¿qué harías?»

- **Qué se observa:** si encuentra la cuarentena, si entiende que no se borró, si cree
  que se modificó su Gmail real.
- **Éxito:** localiza el correo y dice que sigue existiendo, aislado.
- **Error típico:** cree que se eliminó, o que la aplicación le tocó su cuenta de Gmail.
- **Relacionada con:** PI-6, H-5.

---

## 8. Criterios medibles

### 8.1 Tiempo

Se cronometra desde que termina el enunciado hasta que el participante declara que acabó.
Si pide una pista, se detiene y la tarea cuenta como fallida.

| Tarea | Objetivo | Límite |
|---|---|---|
| T-2 (ver la alerta) | < 60 s | 3 min |
| T-3 (encontrar el porqué) | < 45 s | 3 min |
| T-4 (juzgar el correo seguro) | < 60 s | 3 min |
| T-5 (encontrar la cuarentena) | < 45 s | 3 min |

### 8.2 Éxito

Tres estados por tarea, y en T-2 y T-4 se registran **por separado** el éxito operativo
y el de decisión:

| Estado | Definición |
|---|---|
| Completada | Sin ayuda y dentro del límite |
| Completada con ayuda | Necesitó una pista del facilitador |
| Fallida | No la completó, o superó el límite |

**Umbral de aceptación del sprint:** ≥ 80 % de tareas completadas sin ayuda, y **100 %
de aciertos en la decisión de T-2**. Fallar la decisión en el correo peligroso es, para
este producto, un defecto bloqueante aunque la interfaz funcione perfecto.

### 8.3 Errores

Se cuenta cada uno por separado, con la hora del video:

- **Error de navegación:** clic en un sitio que no lleva a donde cree.
- **Error de interpretación:** dice en voz alta algo falso sobre lo que ve en pantalla.
- **Error de decisión:** elige una acción insegura (abrir enlace, descargar adjunto,
  responder a un correo de riesgo alto).

Los de decisión se reportan aparte y pesan más: son los que miden si el producto cumple
su propósito.

### 8.4 Satisfacción

- **Por tarea (SEQ):** inmediatamente al terminar cada una,
  *«¿Qué tan fácil o difícil te resultó?»*, de 1 (muy difícil) a 7 (muy fácil).
  Se pregunta siempre justo al acabar: a los cinco minutos el recuerdo ya está contaminado.
- **Al final (SUS):** cuestionario estándar de 10 ítems, 1 a 5. Resultado de 0 a 100.
  Se usa SUS porque es comparable con otros productos y no es una escala inventada por
  nosotros. **Referencia: 68 es el promedio de la industria.** Por debajo de 68 el
  producto está peor que la media.
- **Una pregunta propia, fuera del SUS:**
  *«Del 1 al 5, ¿qué tan tranquilo te dejaría usar esto con tu correo de verdad?»*
  Mide confianza percibida, que no es lo mismo que facilidad de uso.

---

## 9. Registro de resultados

Una hoja por participante. Se llena durante la sesión, no después.

### 9.1 Ficha del participante

| Campo | Valor |
|---|---|
| Código (P1…P5) | |
| Fecha y hora | |
| Edad / ocupación | |
| Frecuencia de uso del correo | |
| ¿Ha recibido phishing antes? | |
| Facilitador / observador | |
| Archivo de grabación | |
| Incidencias técnicas | |

### 9.2 Resultados por tarea

| Tarea | Tiempo | Éxito operativo | Éxito de decisión | Errores nav. | Errores interp. | Errores decisión | SEQ (1-7) |
|---|---|---|---|---|---|---|---|
| T-1 | | | n/a | | | n/a | |
| T-2 | | | | | | | |
| T-3 | | | n/a | | | n/a | |
| T-4 | | | | | | | |
| T-5 | | | n/a | | | n/a | |

### 9.3 Citas textuales

Literales, con el minuto del video. **No se parafrasea:** una cita reescrita pierde
justo la palabra que revela la confusión.

| Minuto | Tarea | Cita textual | Por qué importa |
|---|---|---|---|
| | | | |

### 9.4 Hallazgos

| ID | Descripción | Severidad | Tarea | Participantes | Historia afectada |
|---|---|---|---|---|---|
| | | | | | |

**Severidad:**

| Nivel | Definición |
|---|---|
| Crítico | Lleva a una decisión insegura, o impide completar la tarea |
| Alto | Bloquea al usuario, que necesita ayuda |
| Medio | Le hace perder tiempo o dudar, pero sale solo |
| Bajo | Molestia o detalle estético |

---

## 10. Preguntas de cierre

Abiertas, al terminar las tareas y **antes** del SUS, para que el cuestionario no
condicione las respuestas.

1. ¿Qué hace esta aplicación, en tus propias palabras?
2. ¿Hubo algún momento en que no entendieras qué estaba pasando?
3. Cuando apareció el aviso rojo, ¿qué pensaste hacer? ¿Lo hiciste?
4. ¿Leíste la lista de razones? ¿Te sirvió o te sobró?
5. ¿Confiarías en esta aplicación con tu correo real? ¿Por qué sí o por qué no?
6. Si pudieras cambiar una sola cosa, ¿cuál sería?

---

## 11. Análisis posterior

Dentro de las 48 horas siguientes a la última sesión:

1. Consolidar las cinco hojas en una sola tabla de hallazgos.
2. Marcar cada hallazgo con cuántos participantes lo sufrieron. **Un problema que le pasa
   a 3 de 5 es un problema del producto; uno que le pasa a 1 puede ser de esa persona.**
3. Contrastar cada hipótesis de la sección 3 y declarar si se confirmó o se cayó.
   Las que se cayeron se explican: ahí está el aprendizaje.
4. Calcular SUS promedio y compararlo con 68.
5. Abrir un issue en el repositorio por cada hallazgo crítico o alto, enlazado a la
   historia afectada.
6. Llevar el resumen a la retrospectiva del Sprint 3.

---

## 12. Limitaciones de este protocolo

Se declaran por honestidad, y para que nadie lea los resultados como más de lo que son:

- **Cinco participantes no dan significancia estadística.** Los porcentajes de este
  documento son indicativos. Con 5 personas, un 80 % es «4 de 5», no una medición.
- **Es un entorno de laboratorio.** El participante sabe que lo observan y presta más
  atención de la que prestaría un martes cualquiera con 40 correos sin leer. Es probable
  que los resultados reales sean **peores** que los de la prueba.
- **Los correos son del dataset simulado**, escritos por el propio equipo. Un phishing
  real está mejor hecho.
- **No se mide retención ni aprendizaje:** solo el primer contacto con el producto. No
  dice nada sobre si la alerta sigue funcionando a la décima vez que aparece, que es
  justo cuando la gente empieza a ignorarlas.
