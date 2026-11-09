# Consolidado de resultados — pruebas de usabilidad

**Estado:** sin ejecutar. Las tablas están vacías porque las sesiones todavía no se han
hecho; se llenan dentro de las 48 horas siguientes a la última.

**Sesiones:** ____ de 5 · **Fechas:** ____ · **Responsable:** Juan Esteban Martínez

---

## 1. Participantes

| Código | Fecha | Edad | Ocupación | Inglés | ¿Phishing antes? | Orden | Incidencias |
|---|---|---|---|---|---|---|---|
| P1 | | | | | | | |
| P2 | | | | | | | |
| P3 | | | | | | | |
| P4 | | | | | | | |
| P5 | | | | | | | |

## 2. Éxito por tarea

**C** sin ayuda · **A** con ayuda · **F** fallida

| Tarea | P1 | P2 | P3 | P4 | P5 | % sin ayuda |
|---|---|---|---|---|---|---|
| T-1 | | | | | | |
| T-2 operativo | | | | | | |
| **T-2 decisión** | | | | | | |
| T-3 | | | | | | |
| T-4 operativo | | | | | | |
| **T-4 decisión** | | | | | | |
| T-5 | | | | | | |
| | | | | | **Total** | |

**Umbral de aceptación del sprint** (sección 8.2 del protocolo):

| Criterio | Objetivo | Resultado | ¿Cumple? |
|---|---|---|---|
| Tareas completadas sin ayuda | ≥ 80 % | | |
| Aciertos en la decisión de T-2 | **100 %** | | |

Fallar la decisión en el correo peligroso es un defecto **bloqueante**, aunque la
interfaz funcione perfecto. Si pasa aunque sea una vez, el criterio no se cumple y se
dice así en el informe.

## 3. Tiempos

En segundos. Se marcan con `*` los que pasaron del límite.

| Tarea | Objetivo | P1 | P2 | P3 | P4 | P5 | Mediana |
|---|---|---|---|---|---|---|---|
| T-2 (ver la alerta) | < 60 s | | | | | | |
| T-3 (encontrar el porqué) | < 45 s | | | | | | |
| T-4 (juzgar el correo seguro) | < 60 s | | | | | | |
| T-5 (encontrar la cuarentena) | < 45 s | | | | | | |

**Mediana, no promedio.** Con cinco datos un solo participante que se bloqueó arrastra
el promedio y cuenta una historia que no pasó.

## 4. Errores

| Tipo | P1 | P2 | P3 | P4 | P5 | Total |
|---|---|---|---|---|---|---|
| Navegación | | | | | | |
| Interpretación | | | | | | |
| **Decisión** | | | | | | |

Los de decisión se detallan uno por uno, porque cada uno es un caso en que el producto
no cumplió su propósito:

| # | Participante | Tarea | Qué hizo | Minuto |
|---|---|---|---|---|
| | | | | |

## 5. Satisfacción

| | P1 | P2 | P3 | P4 | P5 | Promedio |
|---|---|---|---|---|---|---|
| SEQ T-1 (1-7) | | | | | | |
| SEQ T-2 | | | | | | |
| SEQ T-3 | | | | | | |
| SEQ T-4 | | | | | | |
| SEQ T-5 | | | | | | |
| **SUS (0-100)** | | | | | | |
| Confianza (1-5) | | | | | | |

SUS promedio: ____ · Referencia de la industria: **68** · Diferencia: ____

Se reportan siempre los cinco valores, no solo el promedio: con n = 5, una persona
mueve el resultado 20 puntos.

## 6. Contraste de hipótesis

La parte que importa. **Las hipótesis que se caen son el aprendizaje**; si todas se
confirman, la prueba no enseñó nada y hay que sospechar de cómo se formularon.

| # | Hipótesis | ¿Se confirmó? | Evidencia | Qué significa |
|---|---|---|---|---|
| H-1 | ≥ 4 de 5 identifican el correo de riesgo alto sin ayuda | | | |
| H-2 | Se actúa sobre la acción recomendada y apenas se lee la lista de indicadores | | | |
| H-3 | Los indicadores citan el término en inglés y ≥ 2 de 5 no lo relacionan con el correo | | | |
| H-4 | ≥ 1 de 5 da por bueno el correo seguro sin comprobarlo | | | |
| H-5 | ≥ 2 de 5 siguen creyendo que se modificó su Gmail pese al aviso | | | |

Y las preguntas de investigación, respondidas en prosa, dos o tres líneas cada una:

| # | Pregunta | Respuesta |
|---|---|---|
| PI-1 | ¿Entiende qué significan «Malicioso», «Sospechoso» y «Seguro»? | |
| PI-2 | ¿Le sirve la explicación de indicadores (RF-04) o la ignora? | |
| PI-3 | ¿La alerta de riesgo alto cambia lo que hace, o solo la cierra? | |
| PI-4 | ¿Sigue la acción recomendada? | |
| PI-5 | ¿Acepta como seguro un correo peligroso solo porque no está marcado? | |
| PI-6 | ¿Encuentra la cuarentena y entiende que el correo no se borró? | |

## 7. Hallazgos

Ordenados por severidad y, dentro de cada nivel, por cuántos los sufrieron.

**Un problema que le pasa a 3 de 5 es un problema del producto; uno que le pasa a 1
puede ser de esa persona.** La columna «Participantes» es la que decide qué se arregla.

| ID | Descripción | Severidad | Tarea | Participantes | Historia afectada | Issue |
|---|---|---|---|---|---|---|
| H-01 | | | | ?/5 | | |
| H-02 | | | | ?/5 | | |
| H-03 | | | | ?/5 | | |

| Severidad | Definición |
|---|---|
| **Crítico** | Lleva a una decisión insegura, o impide completar la tarea |
| **Alto** | Bloquea al usuario, que necesita ayuda |
| **Medio** | Le hace perder tiempo o dudar, pero sale solo |
| **Bajo** | Molestia o detalle estético |

## 8. Citas que lo explican

Tres o cuatro, las que hacen entender un hallazgo mejor que la descripción.

| Participante | Minuto | Cita | Hallazgo |
|---|---|---|---|
| | | | |

## 9. Qué se hace con esto

- [ ] Abrir un issue por **cada hallazgo crítico o alto**, enlazado a la historia afectada, y anotar su número en la tabla de la sección 7.
- [ ] Llevar este consolidado a la retrospectiva del Sprint 3.
- [ ] Publicar el resumen en la wiki, dentro del documento maestro del sprint.
- [ ] Los hallazgos medios y bajos van al backlog sin issue propio, salvo que se repitan en 3 o más participantes.

## 10. Lo que estos resultados **no** dicen

Se escribe antes de que alguien lo lea como más de lo que es:

- Cinco participantes no dan significancia estadística. Un «80 %» aquí es «4 de 5».
- Es un laboratorio: el participante sabe que lo observan y presta más atención de la que
  prestaría un martes con 40 correos sin leer. Lo real es probablemente **peor**.
- Los correos son del dataset simulado y están en inglés; un phishing real está mejor
  hecho, y el motor hoy ni siquiera detecta uno escrito en español.
- Solo se mide el primer contacto. No dice nada sobre si la alerta sigue funcionando a la
  décima vez que aparece, que es justo cuando la gente deja de mirarlas.
