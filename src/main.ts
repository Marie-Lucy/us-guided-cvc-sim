// Arranque: prepara las dos vistas, los controles y el loop.

import './ui/estilos.css';
import { NOMBRES_FASE } from './config/fases';
import { DT_MAXIMO_S, MS_POR_S } from './config/ui';
import { PASO_TECLADO_MM } from './config/anatomia';
import {
  GANANCIA_MIN_DB, GANANCIA_MAX_DB, GANANCIA_PASO_DB,
  PROFUNDIDAD_MIN_MM, PROFUNDIDAD_MAX_MM, PROFUNDIDAD_PASO_MM, MM_POR_CM,
} from './config/ultrasonido';
import {
  obtenerEstado, fasesSiguientes, irA, reiniciar, actualizar, alCambiarFase, fijarCondicion, motivoBloqueo,
} from './core/estado';
import type { Fase } from './config/fases';
import {
  obtenerSonda, moverSonda, desplazarSonda, fijarCompresion, presionarTecla, actualizarSonda, reiniciarSonda,
  rotarSonda,
} from './sonda/sonda';
import {
  iniciarValsalva, actualizarValsalva, intensidadValsalva, valsalvaActiva, reiniciarValsalva,
} from './paciente/valsalva';
import { corteTransversal, cicloRespiratorio, pulsoCardiaco, presionSonda } from './anatomia/anatomia';
import { dibujarCortePlano, dibujarEjeLargoPlano } from './ultrasonido/renderPlano';
import { datosEjeLargo } from './ultrasonido/ejeLargo';
import { crearRenderUS } from './ultrasonido/renderUS';
import { dibujarOverlay } from './ultrasonido/overlay';
import { calcularVista } from './ultrasonido/vista';
import {
  parametrosShader, elementosEnImagen, dispositivoVisible, type Instrumento, type DispositivoEnVaso,
} from './ultrasonido/parametros';
import type { Plano } from './aguja/geometria';
import {
  obtenerAjustes, cambiarGanancia, cambiarProfundidad, cambiarEtiquetas, cambiarEsquema, cambiarDoppler,
  gananciaPorcentaje,
} from './ultrasonido/ajustes';
import { crearEscena3D, type ModoPuntero } from './escena/escena3d';
import {
  estadoInicial, elegirEntrada, cambiarAngulo, cambiarOrientacion, moverAguja, reevaluar, actualizarFlash, direccion,
  type CortePorAltura,
} from './aguja/aguja';
import {
  ANGULO_MIN_GRADOS, ANGULO_MAX_GRADOS, ORIENTACION_MIN_GRADOS, ORIENTACION_MAX_GRADOS,
  VELOCIDAD_AGUJA_MM_S, ALCANCE_COMPRESION_MM, RADIO_AGUJA_MM, BRILLO_AGUJA,
} from './config/aguja';
import { MUESTRAS_EJE_LARGO } from './config/ultrasonido';
import { VELOCIDAD_GUIA_MM_S, VELOCIDAD_DILATADOR_MM_S, VELOCIDAD_CATETER_MM_S } from './config/procedimiento';
import {
  iniciarSeldinger, moverGuia, moverDilatador, moverCateter, retirarAguja, retirarGuia, confirmarGuia, nivelEctopia,
  tramoEnVaso, instrumentoEnTrayecto, motivoParaGuia, motivoParaDilatar, motivoParaVolverAPuncion,
  motivoParaCateter, motivoParaTerminar, type EstadoSeldinger,
} from './procedimiento/seldinger';
import { textosSeldinger } from './ui/textosSeldinger';
import { crearTiraEcg } from './ui/tiraEcg';
import { FRECUENCIA_CARDIACA_LPM } from './config/anatomia';
import { CASO_INICIAL, SORPRESA, caso, elegirSorpresa, type EleccionCaso } from './casos/casos';
import { registroNuevo, archivarAguja, intentosTotales, eventosAguja } from './evaluacion/registro';
import { evaluar } from './evaluacion/evaluacion';
import { APERTURA_VENA_COMPRIMIDA, COMPRESION_PRUEBA, TROMBO_VISIBLE } from './config/evaluacion';
import type { Corte } from './anatomia/anatomia';
import { mostrarEvaluacion, ocultarEvaluacion } from './ui/pantallaEvaluacion';
import { crearControlRendimiento } from './core/rendimiento';
import { prepararInicio } from './ui/pantallaInicio';
import { almacenLocal, leerHistorial, guardarIntento, mejorPuntaje, type Modo } from './evaluacion/historial';
import { TIEMPO_LIMITE_EXAMEN_S, AVISO_TIEMPO_EXAMEN_S } from './config/examen';
import { terminar } from './core/estado';
import { PASOS, INFO_PASOS, tareas, pista, type Paso } from './ui/guiaPasos';
import { dibujarPasos, prepararMentor, dibujarMentor, crearBarra, avisar, formatoTiempo } from './ui/hud';

function elemento<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
  return el as T;
}

const canvasCuello = elemento<HTMLCanvasElement>('canvas-cuello');
const canvasUS = elemento<HTMLCanvasElement>('canvas-us');
const canvasOverlay = elemento<HTMLCanvasElement>('canvas-us-overlay');
const etiquetaFase = elemento('fase-actual');
const etiquetaTiempo = elemento('tiempo');
const botonReiniciar = elemento('boton-reiniciar');
const sliderCompresion = elemento<HTMLInputElement>('compresion');
const valorCompresion = elemento('valor-compresion');
const botonValsalva = elemento('boton-valsalva');
const lecturaSonda = elemento('lectura-sonda');
const sliderGanancia = elemento<HTMLInputElement>('ganancia');
const valorGanancia = elemento('valor-ganancia');
const sliderProfundidad = elemento<HTMLInputElement>('profundidad');
const valorProfundidad = elemento('valor-profundidad');
const casillaDoppler = elemento<HTMLInputElement>('doppler');
const casillaEtiquetas = elemento<HTMLInputElement>('etiquetas');
const casillaEsquema = elemento<HTMLInputElement>('esquema');
const controlesAguja = elemento('controles-aguja');
const sliderAngulo = elemento<HTMLInputElement>('angulo-aguja');
const valorAngulo = elemento('valor-angulo-aguja');
const sliderOrientacion = elemento<HTMLInputElement>('orientacion-aguja');
const valorOrientacion = elemento('valor-orientacion-aguja');
const botonAvanzar = elemento('boton-avanzar');
const botonRetirar = elemento('boton-retirar');
const lecturaAguja = elemento('lectura-aguja');
const controlesSeldinger = elemento('controles-seldinger');
const botonMenos = elemento<HTMLButtonElement>('boton-menos');
const botonMas = elemento<HTMLButtonElement>('boton-mas');
const accionPrincipal = elemento<HTMLButtonElement>('accion-principal');
const accionConfirmar = elemento<HTMLButtonElement>('accion-confirmar');
const lecturaSeldinger = elemento('lectura-seldinger');
const botonGirar = elemento('boton-girar');
const canvasEcg = elemento<HTMLCanvasElement>('canvas-ecg');
const lecturaEcg = elemento('lectura-ecg');
const chipCaso = elemento('chip-caso');
const botonTerminar = elemento<HTMLButtonElement>('boton-terminar');
const valorFc = elemento('valor-fc');
const panelMonitor = canvasEcg.closest('.vitals')!;
const tituloHerramienta = elemento('titulo-herramienta');

// ---- Paciente y registro de la sesión ----
let casoActual = caso(CASO_INICIAL);
let registro = registroNuevo();
let modo: Modo = 'practica';
let esSorpresa = false; // el paciente se eligió al azar y no se dice cuál hasta la evaluación
let tiempoAgotado = false;
const almacen = almacenLocal();

// ---- Aguja y técnica de Seldinger ----
let aguja = estadoInicial();
let seldinger: EstadoSeldinger | null = null; // existe desde que se pasa la guía
// −1 retira, 0 quieto, +1 avanza (la herramienta depende de la fase)
let sentido = 0;
const tiraEcg = crearTiraEcg();
const FASES_SELDINGER: readonly Fase[] = ['guia', 'dilatacion', 'cateter'];
const enSeldinger = (): boolean => FASES_SELDINGER.includes(obtenerEstado().fase);
const conAguja = (): boolean => obtenerEstado().fase !== 'exploracion';
const modoPuntero = (): ModoPuntero => (obtenerEstado().fase === 'puncion' ? 'entrada' : 'sonda');

// Corte anatómico a la altura de la punta. La compresión de la sonda solo
// alcanza a los vasos que están cerca de ella.
function cortePorAltura(tiempo: number): CortePorAltura {
  const s = obtenerSonda();
  const valsalva = intensidadValsalva();
  return (z) => corteTransversal(z, tiempo, {
    compresion: s.compresion * Math.exp(-(((z - s.posicionMm) / ALCANCE_COMPRESION_MM) ** 2)),
    valsalva,
    anatomia: casoActual.anatomia,
  });
}

const PORCENTAJE = 100;

// Con el inicio o la evaluación abiertos, el teclado no mueve nada detrás
const hayVentanaAbierta = (): boolean => document.querySelector('.capa-evaluacion:not([hidden])') !== null;

// Ecografía y cuello en WebGL; sin WebGL, queda el esquema 2D
const renderUS = crearRenderUS(canvasUS);
const escena3D = crearEscena3D(canvasCuello, elemento('etiquetas-cuello'), {
  alMoverSonda: (posicionMm, lateralMm) => moverSonda(posicionMm, lateralMm),
  alElegirEntrada: (posicionMm, lateralMm) => elegirEntrada(aguja, lateralMm, posicionMm),
  modo: modoPuntero,
});

// ---- Tamaños ----
function ajustarCanvas2D(canvas: HTMLCanvasElement): void {
  const ratio = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.getContext('2d')!.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function ajustarTodos(): void {
  ajustarCanvas2D(canvasOverlay);
  ajustarCanvas2D(canvasEcg);
  const us = canvasUS.getBoundingClientRect();
  renderUS?.ajustarTamano(us.width, us.height);
  const cuello = canvasCuello.getBoundingClientRect();
  escena3D?.ajustarTamano(cuello.width, cuello.height);
  const libre = huecoLibre();
  escena3D?.encuadrar(libre.x, libre.y, libre.alto);
}

// Centro del espacio que dejan libre los paneles, para que el cuello quede ahí
function huecoLibre(): { x: number; y: number; alto: number } {
  const ancho = window.innerWidth;
  const izq = document.querySelector('.col-left')!.getBoundingClientRect();
  const der = document.querySelector('.col-right')!.getBoundingClientRect();
  const arriba = document.querySelector('.topbar')!.getBoundingClientRect();
  const abajo = document.querySelector('.toolbar')!.getBoundingClientRect();
  const apilado = der.width > ancho * 0.8; // celular: paneles arriba y abajo
  if (apilado) return { x: ancho / 2, y: (der.bottom + izq.top) / 2, alto: izq.top - der.bottom };
  return { x: (izq.right + der.left) / 2, y: (arriba.bottom + abajo.top) / 2, alto: abajo.top - arriba.bottom };
}

// ---- Dibujo ----
function planoActual(): Plano {
  const s = obtenerSonda();
  return { orientacion: s.orientacion, nivel: s.posicionMm, lateral: s.lateralMm };
}

// Lo que ocupa el trayecto de la aguja: la aguja misma, o la guía, el dilatador o el catéter
function instrumentoActual(): Instrumento | null {
  if (!conAguja() || !aguja.entrada) return null;
  const base = { entrada: aguja.entrada, direccion: direccion(aguja) };
  if (!seldinger?.agujaRetirada) {
    return aguja.insertadaMm > 0 ? { ...base, largoMm: aguja.insertadaMm, radio: RADIO_AGUJA_MM, brillo: BRILLO_AGUJA } : null;
  }
  const t = instrumentoEnTrayecto(seldinger);
  return t ? { ...base, largoMm: t.largoMm, radio: t.radio, brillo: t.brillo } : null;
}

function dispositivoActual(): DispositivoEnVaso | null {
  if (!seldinger?.vaso) return null;
  const t = tramoEnVaso(seldinger);
  return t ? { vaso: seldinger.vaso, ...t } : null;
}

// Corte en la sonda (con su desplazamiento lateral, compresión y Valsalva)
function corteEnSonda(z: number, tiempo: number) {
  const sonda = obtenerSonda();
  return corteTransversal(z, tiempo, {
    lateralMm: sonda.lateralMm, compresion: sonda.compresion, valsalva: intensidadValsalva(),
    anatomia: casoActual.anatomia,
  });
}

function dibujarUltrasonido(tiempo: number): void {
  const sonda = obtenerSonda();
  const ajustes = obtenerAjustes();
  const corte = corteEnSonda(sonda.posicionMm, tiempo);
  anotarBuenasPracticas(corte, sonda.compresion);
  const { width, height } = canvasOverlay.getBoundingClientRect();
  const vista = calcularVista(width, height, ajustes.profundidadMm);
  const ctx = canvasOverlay.getContext('2d')!;
  const plano = planoActual();
  const largo = plano.orientacion === 'longitudinal';
  const datosLargo = largo ? datosEjeLargo(sonda.posicionMm, (z) => corteEnSonda(z, tiempo)) : null;

  const elementos = elementosEnImagen(
    instrumentoActual(), obtenerEstado().fase === 'puncion' ? aguja.tienda : null, dispositivoActual(), plano,
  );
  const tramo = elementos.instrumento ? { a: elementos.instrumentoA, b: elementos.instrumentoB } : null;
  if (ajustes.esquema || !renderUS) {
    if (datosLargo) dibujarEjeLargoPlano(ctx, width, height, vista, datosLargo, MUESTRAS_EJE_LARGO, tramo);
    else dibujarCortePlano(ctx, width, height, vista, corte, tramo);
  } else {
    ctx.clearRect(0, 0, width, height);
    const [anchoBuffer, altoBuffer] = renderUS.tamanoBuffer();
    renderUS.dibujar(parametrosShader(corte, ajustes, vista, renderUS.ratio(), anchoBuffer, altoBuffer, {
      lateralMm: sonda.lateralMm, respiracion: cicloRespiratorio(tiempo), pulso: pulsoCardiaco(tiempo), tiempo,
    }, elementos, datosLargo));
  }
  const avisos = [largo ? 'LONG  ◀ cabeza' : 'TRANS'];
  if (valsalvaActiva()) avisos.push('VALSALVA');
  // En eje largo las etiquetas transversales no corresponden
  dibujarOverlay(ctx, vista, largo ? { ...ajustes, etiquetas: false } : ajustes, corte, avisos);
}

// ¿Está comprimiendo justo sobre un segmento trombosado? (el mentor lo explica)
let tromboComprimido = false;

// Lo que suma en la evaluación: comprobar la compresibilidad y usar el Doppler antes de puncionar
function anotarBuenasPracticas(corte: Corte, compresion: number): void {
  const fase = obtenerEstado().fase;
  if (fase !== 'exploracion' && fase !== 'puncion') return;
  if (corte.aperturaVena < APERTURA_VENA_COMPRIMIDA) registro.comprimioVena = true;
  tromboComprimido = compresion >= COMPRESION_PRUEBA && corte.tromboVena >= TROMBO_VISIBLE;
  if (tromboComprimido) registro.detectoTrombo = true;
  if (obtenerAjustes().doppler) registro.usoDoppler = true;
}

function dibujarEcg(tiempo: number): void {
  const nivel = seldinger ? nivelEctopia(seldinger) : 0;
  const { width, height } = canvasEcg.getBoundingClientRect();
  tiraEcg.dibujar(canvasEcg.getContext('2d')!, width, height, tiempo, nivel);
  lecturaEcg.textContent = nivel > 0 ? 'Extrasístoles ventriculares' : '';
  valorFc.textContent = String(FRECUENCIA_CARDIACA_LPM);
  panelMonitor.classList.toggle('ectopia', nivel > 0);
}

function mostrarLecturas(): void {
  const s = obtenerSonda();
  const lateral = Math.round(s.lateralMm);
  const lado = lateral === 0 ? '' : lateral > 0 ? ' medial' : ' lateral';
  lecturaSonda.textContent = `${Math.round(s.posicionMm)} mm sobre la clavícula · ${Math.abs(lateral)} mm${lado}`;
  valorCompresion.textContent = `${Math.round(presionSonda(s.compresion))} mmHg`;
  botonValsalva.classList.toggle('activo', valsalvaActiva());
  etiquetaTiempo.textContent = formatoTiempo(obtenerEstado().tiempoTotal);
}

let ultimoFlash: 'vena' | 'arteria' | null = null;

function mostrarAguja(): void {
  lecturaAguja.textContent = aguja.entrada
    ? `Insertada ${Math.round(aguja.insertadaMm)} mm · intento ${Math.max(aguja.intentos, 1)}`
    : 'Elige el punto de entrada';
  // El flash es la única pista directa de dónde está la punta, como en la realidad
  const { cantidad, tipo } = aguja.flash;
  // Aviso una sola vez cuando aparece sangre en la jeringa
  const flash = cantidad > 0 ? tipo : null;
  if (flash && flash !== ultimoFlash && obtenerEstado().fase === 'puncion') {
    avisar(flash === 'arteria' ? 'Sangre roja y pulsátil en la jeringa' : 'Flash de sangre oscura en la jeringa', flash === 'arteria' ? 'danger' : 'ok');
  }
  ultimoFlash = flash;
}

function dibujar(): void {
  const tiempo = obtenerEstado().tiempoTotal;
  dibujarUltrasonido(tiempo);
  dibujarEcg(tiempo);
  escena3D?.dibujar(obtenerSonda(), obtenerAjustes().etiquetas, {
    visible: conAguja() && !seldinger?.agujaRetirada,
    conJeringa: obtenerEstado().fase === 'puncion',
    guiaFuera: !!seldinger && seldinger.guia.insertadaMm > 0 && !seldinger.guia.retirada,
    dilatadorMm: seldinger && seldinger.dilatador.mm > 0 ? seldinger.dilatador.mm : null,
    cateterMm: seldinger && seldinger.cateter.mm > 0 ? seldinger.cateter.mm : null,
    entrada: aguja.entrada,
    direccion: direccion(aguja),
    insertadaMm: aguja.insertadaMm,
    flash: aguja.flash,
    pulso: pulsoCardiaco(tiempo),
  });
  mostrarLecturas();
  mostrarAguja();
  mostrarSeldinger();
  mostrarHud();
}

function mostrarSeldinger(): void {
  const t = seldinger ? textosSeldinger(obtenerEstado().fase, seldinger) : null;
  controlesSeldinger.hidden = !t;
  if (!t) return;
  botonMenos.textContent = t.menos;
  botonMas.textContent = t.mas;
  accionPrincipal.hidden = !t.accion;
  accionPrincipal.textContent = t.accion ?? '';
  accionPrincipal.disabled = !!t.accionBloqueada;
  accionPrincipal.title = t.accionBloqueada ?? '';
  accionConfirmar.hidden = !t.confirmar;
  lecturaSeldinger.textContent = t.lectura;
}

function mostrarMensaje(texto: string | null, tipo: 'info' | 'ok' | 'warn' = 'info'): void {
  if (texto) avisar(texto, tipo);
}

// ---- HUD: procedimiento, mentor y barra de herramientas ----
// Tiempo que llevó cada paso (para la lista del procedimiento)
let tiemposPasos: Partial<Record<Paso, number>> = {};
let inicioPaso = 0;

const NOMBRE_HERRAMIENTA: Record<Fase, string> = {
  exploracion: 'Sonda', puncion: 'Aguja', guia: 'Guía', dilatacion: 'Dilatador', cateter: 'Catéter', evaluacion: 'Sonda',
};

// Ir a un paso desde la barra: solo los vecinos permitidos por la máquina de estados
function irAPaso(p: Fase): void {
  if (obtenerEstado().fase === p) return;
  if (!irA(p)) avisar(motivoBloqueo(p) ?? 'Ese paso no está disponible ahora', 'warn');
}

const barra = crearBarra(irAPaso);

function actualizarControles(): void {
  const fase = obtenerEstado().fase;
  document.body.dataset.fase = fase; // el CSS adapta los paneles al paso actual
  requestAnimationFrame(ajustarTodos); // en el celular cambia el alto de los paneles
  etiquetaFase.textContent = NOMBRES_FASE[fase];
  tituloHerramienta.textContent = NOMBRE_HERRAMIENTA[fase];
}

function mostrarHud(): void {
  const fase = obtenerEstado().fase;
  const estado = { registro, aguja, seldinger, tromboComprimido };
  const paso: Paso = fase === 'evaluacion' ? 'cateter' : fase;
  const lista = tareas(paso, estado);
  // El paso siguiente es el primero de las transiciones (avanzar)
  const siguiente = fasesSiguientes()[0];
  const motivo = siguiente ? motivoBloqueo(siguiente) : null;
  const examen = modo === 'examen';
  // En el examen no hay tareas ni pistas: solo el reloj
  dibujarPasos(fase, tiemposPasos, examen ? [] : lista);
  if (examen) mostrarRelojExamen(paso);
  else dibujarMentor(paso, lista, pista(paso, estado, motivo));
  barra.actualizar(fase, (p) => (fasesSiguientes().includes(p) ? motivoBloqueo(p) : 'Sigue el orden del procedimiento'));
  botonTerminar.hidden = fase !== 'cateter';
  const motivoFin = fase === 'cateter' ? motivoBloqueo('evaluacion') : null;
  botonTerminar.disabled = motivoFin !== null;
  botonTerminar.title = motivoFin ?? 'Terminar y ver la evaluación';
}

const tiempoRestante = (): number => Math.max(TIEMPO_LIMITE_EXAMEN_S - obtenerEstado().tiempoTotal, 0);

function mostrarRelojExamen(paso: Paso): void {
  const restante = tiempoRestante();
  const reloj = elemento('examen-reloj');
  reloj.textContent = formatoTiempo(restante);
  reloj.className = `exam-left mono${restante === 0 ? ' over' : restante <= AVISO_TIEMPO_EXAMEN_S ? ' warn' : ''}`;
  elemento('mentor-paso').textContent = `${PASOS.indexOf(paso) + 1}/${PASOS.length} · ${INFO_PASOS[paso].nombre}`;
}

// Modo examen: sin Doppler, etiquetas, esquema ni pistas, y con tiempo límite
function aplicarModo(): void {
  const examen = modo === 'examen';
  document.body.dataset.modo = modo;
  elemento('mentor').classList.toggle('exam', examen);
  elemento('chip-examen').hidden = !examen;
  elemento('examen-vineta').textContent = esSorpresa ? 'Paciente sin datos previos: explora antes de decidir.' : casoActual.descripcion;
  document.querySelector('#mentor .mentor-badge')!.textContent = examen ? 'EXAMEN' : 'MENTOR';
  for (const [casilla, apagar] of [[casillaDoppler, cambiarDoppler], [casillaEtiquetas, cambiarEtiquetas], [casillaEsquema, cambiarEsquema]] as const) {
    if (examen) {
      casilla.checked = false;
      apagar(false);
    }
    casilla.disabled = examen || !renderUS;
  }
}

// Requisitos clínicos de cada paso
function prepararCondiciones(): void {
  fijarCondicion('puncion', 'guia', () => motivoParaGuia(aguja));
  fijarCondicion('guia', 'dilatacion', () => (seldinger ? motivoParaDilatar(seldinger) : 'No hay guía'));
  fijarCondicion('guia', 'puncion', () => (seldinger ? motivoParaVolverAPuncion(seldinger) : null));
  fijarCondicion('dilatacion', 'cateter', () => (seldinger ? motivoParaCateter(seldinger) : 'No hay guía'));
  fijarCondicion('cateter', 'evaluacion', () => (seldinger ? motivoParaTerminar(seldinger) : 'No hay catéter'));
}

// ---- Controles de la sonda ----
function prepararControlesSonda(): void {
  sliderCompresion.addEventListener('input', () => fijarCompresion(Number(sliderCompresion.value) / PORCENTAJE));
  botonValsalva.addEventListener('click', iniciarValsalva);

  // Teclado: flechas mueven la sonda, Espacio comprime (salvo dentro de un control)
  const enControl = (e: KeyboardEvent): boolean =>
    e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || hayVentanaAbierta();
  // Vista desde la cabecera: arriba en pantalla = hacia los pies (clavícula),
  // izquierda = medial, como en la ecografía.
  const movimientos: Record<string, [number, number]> = {
    ArrowUp: [-PASO_TECLADO_MM, 0],
    ArrowDown: [PASO_TECLADO_MM, 0],
    ArrowLeft: [0, PASO_TECLADO_MM],
    ArrowRight: [0, -PASO_TECLADO_MM],
  };
  botonGirar.addEventListener('click', rotarSonda);
  window.addEventListener('keydown', (e) => {
    if (enControl(e)) return;
    if ((e.key === 'r' || e.key === 'R') && !e.repeat) rotarSonda();
    const numero = Number(e.key);
    if (Number.isInteger(numero) && numero >= 1 && numero <= PASOS.length && !e.repeat) irAPaso(PASOS[numero - 1]);
    if (e.code === 'Space') {
      presionarTecla(true);
      e.preventDefault();
    } else if (movimientos[e.key]) {
      desplazarSonda(...movimientos[e.key]);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') presionarTecla(false);
  });
  window.addEventListener('blur', () => presionarTecla(false));
}

// ---- Controles del ecógrafo ----
function prepararDeslizador(
  slider: HTMLInputElement, salida: HTMLElement,
  min: number, max: number, paso: number, inicial: number,
  aplicar: (v: number) => void, texto: () => string,
): void {
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(paso);
  slider.value = String(inicial);
  const alCambiar = (): void => {
    aplicar(Number(slider.value));
    salida.textContent = texto();
  };
  slider.addEventListener('input', alCambiar);
  alCambiar();
}

function prepararCasilla(casilla: HTMLInputElement, inicial: boolean, aplicar: (v: boolean) => void): void {
  casilla.checked = inicial;
  casilla.addEventListener('change', () => aplicar(casilla.checked));
}

function prepararControlesUS(): void {
  const a = obtenerAjustes();
  prepararDeslizador(
    sliderGanancia, valorGanancia, GANANCIA_MIN_DB, GANANCIA_MAX_DB, GANANCIA_PASO_DB, a.gananciaDb,
    cambiarGanancia, () => `${gananciaPorcentaje(obtenerAjustes().gananciaDb)} %`,
  );
  prepararDeslizador(
    sliderProfundidad, valorProfundidad, PROFUNDIDAD_MIN_MM, PROFUNDIDAD_MAX_MM, PROFUNDIDAD_PASO_MM, a.profundidadMm,
    cambiarProfundidad, () => `${(obtenerAjustes().profundidadMm / MM_POR_CM).toFixed(1)} cm`,
  );
  prepararCasilla(casillaDoppler, a.doppler, cambiarDoppler);
  prepararCasilla(casillaEtiquetas, a.etiquetas, cambiarEtiquetas);
  prepararCasilla(casillaEsquema, a.esquema || !renderUS, cambiarEsquema);
  casillaEsquema.disabled = casillaDoppler.disabled = !renderUS;
}

// ---- Controles de la aguja ----
function prepararControlesAguja(): void {
  prepararDeslizador(
    sliderAngulo, valorAngulo, ANGULO_MIN_GRADOS, ANGULO_MAX_GRADOS, 1, aguja.anguloGrados,
    (v) => cambiarAngulo(aguja, v), () => `${aguja.anguloGrados}°`,
  );
  prepararDeslizador(
    sliderOrientacion, valorOrientacion, ORIENTACION_MIN_GRADOS, ORIENTACION_MAX_GRADOS, 1, aguja.orientacionGrados,
    (v) => cambiarOrientacion(aguja, v),
    () => {
      const o = aguja.orientacionGrados;
      return o === 0 ? 'recta' : `${Math.abs(o)}° ${o > 0 ? 'medial' : 'lateral'}`;
    },
  );
  // Botones que actúan mientras se mantienen apretados (aguja o herramienta de Seldinger)
  const mantener = (boton: HTMLElement, v: number): void => {
    boton.addEventListener('pointerdown', (e) => {
      sentido = v;
      boton.setPointerCapture(e.pointerId);
    });
    for (const fin of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      boton.addEventListener(fin, () => { sentido = 0; });
    }
  };
  mantener(botonAvanzar, 1);
  mantener(botonRetirar, -1);
  mantener(botonMas, 1);
  mantener(botonMenos, -1);
  window.addEventListener('keydown', (e) => {
    const fase = obtenerEstado().fase;
    if ((fase !== 'puncion' && !enSeldinger()) || e.repeat || hayVentanaAbierta()) return;
    if (e.key === 'w' || e.key === 'W') sentido = 1;
    if (e.key === 's' || e.key === 'S') sentido = -1;
  });
  window.addEventListener('keyup', (e) => {
    if (['w', 'W', 's', 'S'].includes(e.key)) sentido = 0;
  });
}

// ---- Acciones de Seldinger ----
function prepararControlesSeldinger(): void {
  accionPrincipal.addEventListener('click', () => {
    if (!seldinger) return;
    const fase = obtenerEstado().fase;
    if (fase === 'guia' && retirarAguja(seldinger)) {
      mostrarMensaje('Aguja retirada. Confirma con la ecografía que la guía está en la vena (mejor en eje largo: R).');
    }
    if (fase === 'cateter' && retirarGuia(seldinger)) mostrarMensaje('Guía retirada. Fija el catéter y termina.');
  });
  accionConfirmar.addEventListener('click', () => {
    if (!seldinger) return;
    const visible = dispositivoVisible(dispositivoActual(), planoActual(), corteEnSonda(obtenerSonda().posicionMm, obtenerEstado().tiempoTotal));
    const motivo = confirmarGuia(seldinger, visible);
    if (!motivo && obtenerSonda().orientacion === 'longitudinal') registro.confirmoEnEjeLargo = true;
    mostrarMensaje(motivo ?? 'Guía confirmada en la imagen.');
  });
}

// Mueve lo que corresponda a la fase en este cuadro
function moverHerramienta(dt: number): void {
  if (sentido === 0) return;
  const fase = obtenerEstado().fase;
  if (fase === 'puncion') {
    moverAguja(aguja, sentido * VELOCIDAD_AGUJA_MM_S * dt, cortePorAltura(obtenerEstado().tiempoTotal));
    return;
  }
  if (!seldinger) return;
  if (fase === 'guia') moverGuia(seldinger, sentido * VELOCIDAD_GUIA_MM_S * dt);
  if (fase === 'dilatacion') moverDilatador(seldinger, sentido * VELOCIDAD_DILATADOR_MM_S * dt);
  if (fase === 'cateter') moverCateter(seldinger, sentido * VELOCIDAD_CATETER_MM_S * dt);
}

// Qué se ve según la fase
function alCambiarDeFase(nueva: Fase = obtenerEstado().fase, anterior: Fase = nueva): void {
  const fase = nueva;
  sentido = 0;
  controlesAguja.hidden = fase !== 'puncion';
  // Tiempo del paso que termina (al avanzar); al reiniciar se borra todo
  const ahora = obtenerEstado().tiempoTotal;
  if (anterior !== fase && anterior !== 'evaluacion' && PASOS.indexOf(fase as Paso) > PASOS.indexOf(anterior as Paso)) {
    tiemposPasos[anterior as Paso] = ahora - inicioPaso;
  }
  inicioPaso = ahora;
  if (fase === 'exploracion' && ahora === 0) tiemposPasos = {};
  // Pasar la guía: se desconecta la jeringa y la guía entra por la aguja
  if (fase === 'guia' && anterior === 'puncion') seldinger = iniciarSeldinger(aguja);
  // Volver a la aguja: se saca la guía
  if (fase === 'puncion') seldinger = null;
  if (fase === 'evaluacion') {
    const resultado = evaluar({
      registro,
      intentos: intentosTotales(registro, aguja),
      eventosAguja: eventosAguja(registro, aguja),
      seldinger,
      tiempoS: obtenerEstado().tiempoTotal,
      tiempoAgotado,
      pasosCompletados: PASOS.indexOf(anterior as Paso),
    });
    const mejorAntes = mejorPuntaje(leerHistorial(almacen), casoActual.id);
    guardarIntento(almacen, {
      caso: casoActual.id, modo, puntaje: resultado.puntaje, exito: resultado.exito,
      calificacion: resultado.calificacion, fecha: Date.now(),
    });
    mostrarEvaluacion(resultado, casoActual, esSorpresa);
    mostrarMejorMarca(resultado.puntaje, mejorAntes);
  } else {
    ocultarEvaluacion();
  }
  // Volver a explorar = retirar todo y empezar de nuevo
  if (fase === 'exploracion') {
    // Volver a explorar sin terminar: los pinchazos de esta aguja siguen contando
    if (anterior !== 'evaluacion' && anterior !== fase) archivarAguja(registro, aguja);
    const { anguloGrados, orientacionGrados } = aguja;
    aguja = estadoInicial();
    cambiarAngulo(aguja, anguloGrados);
    cambiarOrientacion(aguja, orientacionGrados);
    seldinger = null;
    tiraEcg.reiniciar();
  }
  // Mientras la aguja está adentro no se puede cambiar su ángulo
  sliderAngulo.disabled = sliderOrientacion.disabled = aguja.insertadaMm > 0;
}

function reiniciarTodo(): void {
  tiempoAgotado = false;
  aguja = estadoInicial(); // la aguja vieja no se archiva: es una partida nueva
  reiniciar();
  registro = registroNuevo();
  reiniciarSonda();
  reiniciarValsalva();
  sliderCompresion.value = '0';
}

// ---- Selector de paciente ----
// En el examen, la línea de "mejor marca" bajo el título de la evaluación
function mostrarMejorMarca(puntaje: number, mejorAntes: number | null): void {
  const linea = elemento('mejor-marca');
  linea.hidden = modo !== 'examen';
  const nueva = mejorAntes === null || puntaje > mejorAntes;
  linea.classList.toggle('new', nueva);
  linea.textContent = nueva ? `¡Nueva mejor marca en examen: ${puntaje}!` : `Tu mejor marca en examen: ${mejorAntes}`;
}

function elegirCaso(eleccion: EleccionCaso, nuevoModo: Modo = modo): void {
  esSorpresa = eleccion === SORPRESA;
  casoActual = caso(eleccion === SORPRESA ? elegirSorpresa() : eleccion);
  modo = nuevoModo;
  aplicarModo();
  chipCaso.textContent = esSorpresa ? 'Paciente sorpresa' : casoActual.nombre;
  chipCaso.title = esSorpresa ? '' : casoActual.descripcion;
  reiniciarTodo();
}

function prepararCasos(): void {
  // Repetir: el mismo paciente (si era sorpresa, ya se sabe cuál, así que se repite ese)
  elemento('repetir-caso').addEventListener('click', () => elegirCaso(casoActual.id));
  elemento('otro-caso').addEventListener('click', () => {
    reiniciarTodo();
    inicio.abrir(esSorpresa ? SORPRESA : casoActual.id, modo);
  });
  elegirCaso(casoActual.id);
}

// ---- Loop ----
let instanteAnterior: number | null = null;
const rendimiento = crearControlRendimiento();

function cuadro(instante: number): void {
  const msCuadro = instanteAnterior === null ? 0 : instante - instanteAnterior;
  const dt = Math.min(msCuadro / MS_POR_S, DT_MAXIMO_S);
  instanteAnterior = instante;
  // Si el equipo no da abasto, se baja la resolución (y se sube cuando sobra)
  const calidad = rendimiento.registrar(msCuadro);
  if (calidad) {
    renderUS?.cambiarEscala(calidad.escala);
    escena3D?.cambiarCalidad(calidad);
  }

  actualizar(dt);
  actualizarSonda(dt);
  actualizarValsalva(dt);
  moverHerramienta(dt);
  // Examen: al acabarse el tiempo, el caso se cierra donde esté
  if (modo === 'examen' && obtenerEstado().fase !== 'evaluacion' && tiempoRestante() === 0) {
    tiempoAgotado = true;
    terminar();
  }
  if (obtenerEstado().fase === 'puncion' && aguja.entrada) {
    if (sentido === 0) reevaluar(aguja, cortePorAltura(obtenerEstado().tiempoTotal));
    actualizarFlash(aguja, dt);
    sliderAngulo.disabled = sliderOrientacion.disabled = aguja.insertadaMm > 0;
  }
  dibujar();
  requestAnimationFrame(cuadro);
}

// ---- Inicio ----
alCambiarFase(actualizarControles);
alCambiarFase((nueva, anterior) => alCambiarDeFase(nueva, anterior));
botonReiniciar.addEventListener('click', reiniciarTodo);
window.addEventListener('resize', ajustarTodos);

ajustarTodos();
actualizarControles();
prepararControlesSonda();
prepararControlesUS();
prepararControlesAguja();
prepararControlesSeldinger();
prepararCondiciones();
const inicio = prepararInicio(elegirCaso, () => leerHistorial(almacen));
prepararCasos();
prepararMentor();
elemento('boton-ayuda').addEventListener('click', () => inicio.abrir(esSorpresa ? SORPRESA : casoActual.id, modo));
botonTerminar.addEventListener('click', () => irAPaso('evaluacion'));
alCambiarDeFase();
requestAnimationFrame(cuadro);

// Solo en desarrollo: acceso desde la consola o los tests de navegador.
// Vite lo elimina del build de producción.
if (import.meta.env.DEV) {
  Object.assign(window, {
    __simulador: {
      aguja: () => aguja,
      elegirEntrada: (x: number, z: number) => elegirEntrada(aguja, x, z),
      mover: (mm: number) => moverAguja(aguja, mm, cortePorAltura(obtenerEstado().tiempoTotal)),
      corte: (z: number) => cortePorAltura(obtenerEstado().tiempoTotal)(z),
      seldinger: () => seldinger,
      guia: (mm: number) => seldinger && moverGuia(seldinger, mm),
      dilatador: (mm: number) => seldinger && moverDilatador(seldinger, mm),
      cateter: (mm: number) => seldinger && moverCateter(seldinger, mm),
      sonda: (pos: number, lateral: number) => moverSonda(pos, lateral),
      rotar: () => rotarSonda(),
      registro: () => registro,
      caso: (id: EleccionCaso, m?: Modo) => elegirCaso(id, m),
      casoActual: () => casoActual.id,
      terminar: () => terminar(),
      avanzarReloj: (s: number) => actualizar(s),
      ir: (f: Fase) => irA(f),
      motivo: (f: Fase) => motivoBloqueo(f),
    },
  });
}
