# Simulador de acceso venoso central guiado por ultrasonido

Memoria del proyecto. Léela al inicio de cada sesión antes de tocar código.

## Objetivo

Simulador web en el que el usuario canaliza la **vena yugular interna derecha** con ultrasonido en tiempo real y técnica de Seldinger:

1. Explora con la sonda e identifica cuál vaso es la vena y cuál la arteria.
2. Comprime para confirmar: la vena colapsa, la carótida no.
3. Elige punto de entrada y ángulo, y avanza la aguja siguiendo la punta en la imagen.
4. Ve el *tenting* de la pared y el flash de sangre al entrar.
5. Pasa la guía, la confirma en la vena, dilata y coloca el catéter.
6. Recibe una evaluación: intentos, tiempo y complicaciones.

**Complicaciones que se detectan:** punción carotídea, punción de pared posterior, neumotórax (aguja demasiado profunda cerca de la clavícula) y ectopia ventricular por guía demasiado introducida.

La pantalla tiene dos paneles lado a lado (apilados en pantallas angostas):
- **Vista externa del cuello:** paciente en decúbito, cabeza girada a la izquierda. Ahí se mueve la sonda y se elige el punto de entrada.
- **Imagen de ultrasonido:** corte transversal generado en tiempo real según la posición de la sonda, la compresión y la aguja.

## Stack

El mismo de los otros simuladores (`brain-surgery-sim`, `lab-sim`):

- **TypeScript** estricto + **Vite**. Gráficos con **Canvas 2D** (ultrasonido) y **Three.js** (vista 3D del cuello, desde la etapa 4).
- **Vitest** para tests unitarios en `tests/`. La lógica (anatomía, física, evaluación) no toca el DOM, para poder testearla.
- Despliegue en **GitHub Pages** con `.github/workflows/deploy.yml` en cada push a `main` o `master` (corre tests y build). Pages debe estar en Settings → Pages → Source: GitHub Actions. `base` en `vite.config.ts` es `/us-guided-cvc-sim/`: debe coincidir con el nombre del repo.

```
npm install
npm run dev     # servidor local
npm test        # tests
npm run build   # chequeo de tipos + build de producción
```

Antes de cada commit: `npm test` y `npm run build` sin errores.

## Estructura de carpetas

```
index.html
src/
  main.ts             # arranque y loop con requestAnimationFrame
  config/             # TODAS las constantes con nombre
    fases.ts          #   fases y transiciones
    anatomia.ts       #   medidas anatómicas y fisiológicas
    ultrasonido.ts    #   imagen de ultrasonido
    ui.ts             #   loop
    rendimiento.ts    #   calidad adaptable
    aguja.ts, procedimiento.ts, evaluacion.ts, escena.ts
  core/
    estado.ts         # máquina de estados de la partida
    matematica.ts     # limitar, lerp, suavizar…
  anatomia/anatomia.ts  # modelo paramétrico del cuello en mm (puro, sin DOM)
  ultrasonido/        # render de la imagen de ultrasonido
  sonda/sonda.ts      # posición, desplazamiento lateral, compresión
  paciente/valsalva.ts  # maniobra de Valsalva en el tiempo
  escena/             # vista 3D: cuerpo.ts (geometría pura), escena3d.ts, modeloSonda.ts, texturas.ts
  aguja/              # geometria.ts (segmento, cruce con el haz) y aguja.ts (punta, tienda, eventos)
  procedimiento/      # seldinger.ts (guía, dilatador, catéter, requisitos) y ecg.ts
  evaluacion/         # registro.ts (sesión), evaluacion.ts (resultado, puntaje, explicaciones), historial.ts (intentos guardados)
  casos/casos.ts      # pacientes: anatomía + fisiología
  ui/                 # estilos.css, hud.ts, guiaPasos.ts (tareas y pistas, puro), pantallaInicio.ts, pantallaEvaluacion.ts, tiraEcg.ts, textosSeldinger.ts
tests/                # *.test.ts
```

Fases de la máquina de estados: `exploracion`, `puncion`, `guia`, `dilatacion`, `cateter`, `evaluacion`.

## Unidades

- Todas las medidas internas en **milímetros** (posiciones, radios, profundidades, longitud de aguja).
- Ángulos internos en radianes; en la interfaz se muestran en grados.
- La conversión mm → píxeles ocurre **solo en el render**, nunca en la lógica.
- Corte transversal: `x` horizontal (0 = centro de la sonda, negativo = lateral, positivo = medial); `y` profundidad desde la piel, hacia abajo.
- Orientación en pantalla: el operador está en la cabecera, la marca de la sonda va hacia su izquierda. En la ecografía la izquierda es **medial** y la derecha **lateral**, igual que en la vista 3D. Toda conversión pasa por `src/ultrasonido/vista.ts` (y el shader repite la misma fórmula).
- Escena 3D: 1 unidad = 1 mm; ver `src/config/escena.ts` para los ejes.
- Posición de la sonda a lo largo del cuello: mm desde la clavícula (0 a 60).

## Reglas físicas

Cada regla viene de una diferencia real entre la yugular y la carótida o de cómo el ultrasonido convierte tejido en brillo.

- **Vena colapsable:** la yugular trabaja a ~5–10 cmH₂O. El radio vertical de la vena baja en proporción a la compresión de la sonda (se aplasta desde arriba, no se encoge en el sitio).
- **Arteria no colapsable y pulsátil:** la carótida trabaja a ~80–120 mmHg. Su radio casi no cambia con la compresión y pulsa ~5–10 % con cada latido.
- **Ley del tubo (una sola regla para los dos vasos):** apertura = 1 + (presión interna − presión de la sonda) / 12 mmHg, limitada entre 0.07 y 1. La sonda llega a 40 mmHg: supera la venosa (6) pero no la diastólica (75). La vena se aplasta desde arriba (la pared posterior queda fija) y se ensancha al colapsar.
- **Respiración y Valsalva:** el radio de la vena varía con la respiración y aumenta con Valsalva o Trendelenburg.
- **Posición relativa:** en el corte transversal la yugular queda lateral y más superficial; la carótida, medial y algo más profunda. En la variante anatómica la vena está encima de la arteria.
- **Ecogenicidad:**
  - vasos anecoicos (negros);
  - refuerzo acústico posterior (banda más brillante detrás de cada vaso);
  - músculo gris con estrías; paredes vasculares y pleura como líneas brillantes;
  - atenuación con la profundidad, compensada por la ganancia;
  - speckle estable (no parpadea cada frame), pre-renderizado fuera de pantalla.
- **Aguja:** muy reflectiva; punto o línea blanca con artefacto en cola.
- **Marco de la aguja:** x medial, y profundidad, z altura sobre la clavícula (la misma "posición" que la sonda). La sonda mira el plano z = posición; en la imagen x_img = x − lateral de la sonda. La punta se evalúa con el corte a SU altura (`corteTransversal(z_punta)`), y la compresión de la sonda solo alcanza a ±10 mm.
- **Tienda y perforación:** la punta hunde la pared anterior hasta 4 mm (vena) o 2 mm (arteria) antes de perforarla. Si la vena es más fina que eso (colapsada), la punta la cruza entera sin flash: punción de pared posterior.
- **Eje largo:** con la sonda girada, el haz es el plano x = lateral; en la imagen x_img = z − posición (izquierda = cabeza). Cada columna de la imagen es el corte transversal a esa altura evaluado en x = 0. La guía en la luz se ve solo si cae dentro del grosor del haz (±0.75 mm + su radio).
- **Seldinger:** la guía solo avanza si la punta estaba en un vaso (si no, resistencia a los 6 mm). Más de 17 cm de guía más allá de la aguja (o catéter a más de 17.5 cm de la piel) en la vena → extrasístoles; más de 22 cm → bigeminismo. En la carótida no hay extrasístoles (va hacia la aorta). Dilatar con la guía en la carótida es complicación grave. Catéter objetivo: 12–16 cm desde la piel.
- **Trombo:** `Anatomia.trombo` da la fracción de la luz ocupada a cada altura (`ocupacionTrombo`), apoyada en la pared posterior (`enTrombo`, que el shader repite). Apertura = max(ley del tubo, ocupación); sin variación respiratoria ni Valsalva en el tramo ocupado; sin refuerzo posterior ni Doppler dentro del trombo; tienda de 0.6 mm sobre trombo; la punta dentro del trombo es `lugar = 'trombo'`, sin flash, evento `puncion_trombo` (grave).
- **Paciente sorpresa:** `elegirSorpresa()` elige un caso al azar; mientras dura la partida ningún texto de la interfaz nombra al paciente real (barra superior, mentor, viñeta). Se revela en la evaluación y el historial guarda el caso real.
- **Modo examen:** sin Doppler, etiquetas, esquema, tareas ni pistas; 8 minutos. Al agotarse, `terminar()` lleva a la evaluación y el tope sin éxito (40) se multiplica por pasos completados / 5. Cada intento (práctica o examen) se guarda en el historial; el mejor puntaje es solo de examen.
- **Demostración:** `procedimiento/demo.ts` es un guion de pasos (`PASOS_DEMO`) que maneja el simulador a través de `DemoHost`, con velocidades en `config/demo.ts`. Hace el caso normal en práctica, sin complicaciones (lo verifica `tests/demo.test.ts`). Cualquier clic o tecla fuera del inicio y de la evaluación devuelve el control. Lo que empezó la demo no se guarda en el historial.
- **Pacientes:** todo lo que cambia entre casos vive en la `Anatomia` (forma) y su `fisiologia` (presión venosa, amplitud respiratoria, tienda máxima). Ningún otro módulo pregunta qué caso es. Cada caso nuevo debe pasar el test de no solapamiento (en reposo y con Valsalva).
- **Evaluación:** éxito = catéter en la vena, guía retirada y ninguna complicación grave. Puntaje sobre 100: −10 por pinchazo extra, −1 cada 30 s pasados los 5 min (tope 15), −40 grave, −20 moderada, −10 leve; sin éxito, máximo 40. Cada tipo de complicación cuenta una vez.
- **Bordes de los instrumentos:** perfiles con borde nítido (`smoothstep`), nunca gaussianas anchas: con la compresión logarítmica una gaussiana se ve como un halo enorme.
- **Aguja como segmento e imagen como intersección:** la aguja es un segmento 3D (punto de entrada **e**, dirección unitaria **d**, longitud insertada *L*). El haz es un plano (punto **p₀**, normal **n**). Se dibuja el punto de cruce

  t = ((p₀ − e) · n) / (d · n),  x = e + t·d

  solo si 0 ≤ t ≤ L. Si la punta no está en el plano, ese punto es el **cuerpo** de la aguja, no la punta (trampa fuera de plano). Esto debe reproducirse fielmente.

## Plan por etapas

Cada etapa deja algo jugable. Una etapa por sesión, un commit por etapa.

1. Esqueleto y máquina de estados.
2. Modelo anatómico.
3. Imagen de ultrasonido.
4. Sonda.
5. Aguja.
6. Técnica de Seldinger.
7. Casos y evaluación.
8. Pulido y publicación.

Los detalles de cada etapa los da el usuario al inicio de cada sesión.

**Estado actual:** las 8 etapas terminadas, interfaz con la identidad de `lab-sim`, más **modo examen** (`config/examen.ts`, `evaluacion/historial.ts`: sin ayudas, 8 min, historial y mejor puntaje en localStorage) **paciente con trombosis** (`trombo` en la `Anatomia`), paciente sorpresa **Ver una demostración primero** (`procedimiento/demo.ts`) e **idiomas** ES · PT · EN (`src/i18n/`). Próximos extras posibles: subclavia/femoral, aguja en plano como técnica propia.

## Estilo visual

La interfaz comparte identidad con `lab-sim` (Lab Theme) y `brain-surgery-sim`. Al agregar o cambiar algo, usar sus mismas piezas:

- **Tokens** en `:root` de `src/ui/estilos.css` (copiados de `lab-sim`): azul marino `--navy`, verde `--green`/`--accent`, paneles de vidrio `--panel`, Plus Jakarta Sans (`--sans`) y números en `--mono`. No inventar colores sueltos.
- **Composición:** la escena 3D a pantalla completa (`.gl-canvas`, fondo transparente sobre el degradé) y paneles `.panel` flotando: `.topbar`, `.col-left` (`.checklist`, `.device`), `.col-right` (`.ecografo`, `.mentor`, `.vitals`), `.toolbar` abajo y `.toasts`. La cámara se centra en el hueco libre entre paneles (`encuadrar`).
- **Componentes:** `.chip` (y `.chip-check` para interruptores), `.btn`, `.btn-primary`, `.hold` para botones mantenidos, `.panel-title` en versalitas, `.mentor-hint` (`ok`/`warn`/`danger`), `.toast`, `.debrief-card` con `.db-item`, portada `.start-screen.ss`.
- **La imagen de ecografía** es la única superficie oscura (es la pantalla del equipo).
- En celular (≤ 720 px): ecógrafo y mentor arriba, el 3D en el medio, controles del paso actual y barra abajo.
- Nombre de la app: «Eco CVC» (en `index.html`, `pantallaInicio.ts` y el README).

## Convenciones

- Comentarios en **español**. Interfaz en **español, portugués e inglés** (`src/i18n/`): ningún texto visible va escrito en el código; se usa `t('clave')` (o `tk` para claves armadas) y el HTML fijo lleva `data-i18n` / `data-i18n-aria` / `data-i18n-title`. `es.ts` es la referencia: toda clave nueva va en los tres diccionarios (lo verifica `tests/i18n.test.ts`). Los objetos con textos (`INFO_PASOS`, `CASOS`) usan getters para seguir al idioma sin reconstruirse; el historial guarda la `nota` como id. Decimales visibles con `fmt()`.
- Calibración de la imagen: las reflectividades son amplitudes relativas (1 = reflector muy fuerte); se ven a través de la compresión logarítmica (`PISO_DB`, `RANGO_DINAMICO_DB`). Para ajustar el aspecto, mover primero esas dos y la ganancia, no cada tejido.
- Funciones pequeñas, con una sola responsabilidad.
- **Nada de números mágicos:** toda constante va con nombre en `src/config/`.
- Cada regla física o clínica nueva lleva su test.
- En etapas grandes (3, 5, 6) presentar el plan de archivos y cambios antes de escribir código.
- Explicar la matemática cuando el prompt lo pida.
- Al terminar una etapa: actualizar la línea «Estado actual» de este archivo.
- Capturas del README: se generan con Playwright contra `npm run dev` usando `window.__simulador` (solo existe en desarrollo).
- `[hidden]` siempre gana (`display: none !important`): no hace falta pelear con `display: flex` de las clases.
