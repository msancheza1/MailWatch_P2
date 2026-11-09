# Kit de ejecución — pruebas de usabilidad (Sprint 3)

El **qué** y el **por qué** están en [`../protocolo-usabilidad.md`](../protocolo-usabilidad.md).
Aquí está el **cómo**: lo que se imprime, lo que se lee en voz alta y lo que se llena
durante la sesión.

| Archivo | Cuándo se usa | Quién lo llena |
|---|---|---|
| [`consentimiento.md`](consentimiento.md) | Antes de encender la grabación | El participante |
| [`cuestionario-previo.md`](cuestionario-previo.md) | Antes de abrir la aplicación | El facilitador, preguntando |
| [`guion-sesion.md`](guion-sesion.md) | Durante toda la sesión | Nadie: se lee |
| [`hoja-registro.md`](hoja-registro.md) | Durante toda la sesión | El observador |
| [`sus.md`](sus.md) | Al final, después de las preguntas abiertas | El participante |
| [`consolidado.md`](consolidado.md) | Dentro de las 48 h siguientes a la última sesión | El responsable |

Una copia de `cuestionario-previo.md`, `hoja-registro.md` y `sus.md` **por participante**.
Se nombran `P1`…`P5`; en ningún archivo va el nombre real.

---

## Antes del primer participante (una vez)

```bash
docker compose up -d                                  # en la raíz
cd backend && PGPORT=5433 npm run db:migrate          # crea las tablas
PGPORT=5433 npm run user:create                       # cuenta de la sesión, SIN admin
cd ../frontend && npm run dev
```

El contenedor publica PostgreSQL en el **5433**, no en el 5432. Sin `PGPORT=5433` los
comandos fallan con un error de conexión que no explica la causa.

La cuenta con la que se deja la sesión abierta **no puede ser administradora**: un
administrador ve además el panel de métricas del modelo (US-10), que no entra en ninguna
tarea y cambia lo primero que mira el participante en T-1.

## Antes de **cada** participante

```bash
cd backend && PGPORT=5433 npm run usabilidad:reset -- --confirmar
```

Deja los cinco correos sin analizar, la cuarentena vacía, la sensibilidad en estándar y
los `id` otra vez en 1…5 —que es como los nombra el guion—. Sin este paso el segundo
participante encuentra la bandeja que dejó el primero y sus tiempos dejan de ser
comparables.

El script imprime los cinco correos con su `id`. **Compararlos con la tabla de la
sección 5 del protocolo antes de abrir la puerta.** Si no coinciden, la sesión no empieza.

Después, en la aplicación:

- [ ] Recargar la página y confirmar que las tres tarjetas marcan 0 y los correos salen «Sin analizar».
- [ ] **No** pulsar «Cargar dataset de prueba». El reinicio ya dejó los correos; cada clic añade otra copia.
- [ ] Iniciar la grabación de pantalla y audio.
- [ ] Cronómetro en cero.

> La prueba se ejecuta contra el dataset simulado, no contra el correo real de nadie. No
> se pide ni se escribe ninguna contraseña del participante en ningún momento.

## Orden de la sesión

1. Bienvenida y consentimiento firmado (2 min).
2. Cuestionario previo (3 min).
3. Tareas T-1 a T-5, con su SEQ justo al terminar cada una (20-25 min).
4. Preguntas abiertas de cierre (5 min).
5. SUS y pregunta de confianza (5 min).

T-3 y T-4 se alternan entre participantes. El orden de cada uno queda anotado en su hoja
de registro; si no se anota, al analizar no se puede saber qué efecto tuvo.

| Participante | Orden |
|---|---|
| P1, P3, P5 | T-1, T-2, **T-3, T-4**, T-5 |
| P2, P4 | T-1, T-2, **T-4, T-3**, T-5 |

## Después de cada participante

- [ ] Guardar la grabación como `P<n>-<fecha>.mp4`, fuera del repositorio.
- [ ] Pasar a limpio la hoja de registro **antes** del siguiente participante, mientras se recuerda.
- [ ] Reiniciar la base otra vez.

## Qué nunca se guarda en el repositorio

Nombre, correo, teléfono, cara o voz del participante, y las grabaciones. En el
repositorio solo van los códigos `P1`…`P5`, los datos del cuestionario previo —edad,
ocupación, hábitos— y los hallazgos. El consentimiento firmado se archiva aparte, con la
documentación del curso.
