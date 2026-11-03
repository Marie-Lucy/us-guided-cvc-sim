// Traduce el corte anatómico y los ajustes a los valores que recibe el shader.
// Puro (sin WebGL) para poder testearlo.

import type { Corte, Elipse } from '../anatomia/anatomia';
import type { AjustesUS } from './ajustes';
import type { Vista } from './vista';
import { ANCHO_SONDA_MM } from '../config/anatomia';
import { FOCO_MM } from '../config/ultrasonido';
import { MITAD_GROSOR_HAZ_MM, ANCHO_TIENDA_MM, ALCANCE_TIENDA_EN_HAZ_MM } from '../config/aguja';
import { cruceConPlano, type P3, type Plano } from '../aguja/geometria';
import type { Tienda, Vaso } from '../aguja/aguja';

export type Vec4 = [number, number, number, number];
type Vec3 = [number, number, number];
type Vec2 = [number, number];

// Instrumento recto que sigue el trayecto de la aguja: la aguja misma, o la
// guía, el dilatador o el catéter en el tramo de la piel al vaso.
export interface Instrumento { entrada: P3; direccion: P3; largoMm: number; radio: number; brillo: number }

// Guía o catéter dentro del vaso: ocupa la luz entre dos alturas del cuello.
export interface DispositivoEnVaso { vaso: Vaso; desdeZ: number; hastaZ: number; radio: number; brillo: number }

export interface ElementosEnImagen {
  instrumento: number; // 1 = cruza el haz
  instrumentoA: Vec2; // tramo dentro del haz (mm de la imagen)
  instrumentoB: Vec2;
  instrumentoForma: Vec2; // radio, brillo
  tiendaVena: Vec3; // x en la imagen, hundimiento, ancho
  tiendaArteria: Vec3;
  dispositivo: number; // 0 = nada, 1 = en la vena, 2 = en la arteria
  dispositivoTramo: Vec4; // desde z, hasta z, radio, brillo
}

const SIN_TIENDA: Vec3 = [0, 0, 1];
export const SIN_ELEMENTOS: ElementosEnImagen = {
  instrumento: 0, instrumentoA: [0, 0], instrumentoB: [0, 0], instrumentoForma: [1, 0],
  tiendaVena: SIN_TIENDA, tiendaArteria: SIN_TIENDA, dispositivo: 0, dispositivoTramo: [0, 0, 1, 0],
};

// Posición de la tienda en la imagen y cuánto se ve según su distancia al plano del haz.
function tiendaEnImagen(t: Tienda, plano: Plano): Vec3 {
  const transversal = plano.orientacion === 'transversal';
  const xImagen = transversal ? t.x - plano.lateral : t.z - plano.nivel;
  const fueraDelPlano = transversal ? t.z - plano.nivel : t.x - plano.lateral;
  const cerca = Math.exp(-((fueraDelPlano / ALCANCE_TIENDA_EN_HAZ_MM) ** 2));
  return [xImagen, t.profundidadMm * cerca, ANCHO_TIENDA_MM];
}

// Lo que la ecografía muestra de los instrumentos con la sonda en este plano.
export function elementosEnImagen(
  instrumento: Instrumento | null, tienda: Tienda | null, dispositivo: DispositivoEnVaso | null, plano: Plano,
): ElementosEnImagen {
  const r: ElementosEnImagen = { ...SIN_ELEMENTOS };
  if (instrumento) {
    const cruce = cruceConPlano(instrumento.entrada, instrumento.direccion, instrumento.largoMm, plano, MITAD_GROSOR_HAZ_MM);
    if (cruce) {
      r.instrumento = 1;
      r.instrumentoA = [cruce.a.x, cruce.a.y];
      r.instrumentoB = [cruce.b.x, cruce.b.y];
      r.instrumentoForma = [instrumento.radio, instrumento.brillo];
    }
  }
  if (tienda) {
    if (tienda.vaso === 'vena') r.tiendaVena = tiendaEnImagen(tienda, plano);
    else r.tiendaArteria = tiendaEnImagen(tienda, plano);
  }
  if (dispositivo) {
    r.dispositivo = dispositivo.vaso === 'vena' ? 1 : 2;
    r.dispositivoTramo = [dispositivo.desdeZ, dispositivo.hastaZ, dispositivo.radio, dispositivo.brillo];
  }
  return r;
}

// ¿Se ve la guía (o el catéter) dentro del vaso en la imagen actual?
// corteEnSonda: corte a la altura de la sonda, con su desplazamiento lateral aplicado.
export function dispositivoVisible(d: DispositivoEnVaso | null, plano: Plano, corteEnSonda: Corte): boolean {
  if (!d) return false;
  const e: Elipse = d.vaso === 'vena'
    ? corteEnSonda.vena
    : { cx: corteEnSonda.arteria.cx, cy: corteEnSonda.arteria.cy, rx: corteEnSonda.arteria.r, ry: corteEnSonda.arteria.r };
  if (plano.orientacion === 'transversal') {
    // Un punto en la luz: la sonda tiene que estar en una altura que la guía ocupa
    const dentroDelTramo = plano.nivel >= d.desdeZ && plano.nivel <= d.hastaZ;
    return dentroDelTramo && Math.abs(e.cx) < ANCHO_SONDA_MM / 2;
  }
  // Eje largo: una línea; tiene que caer dentro del grosor del haz (mismo criterio que el shader)
  const mitad = ANCHO_SONDA_MM / 2;
  const seSolapan = d.hastaZ >= plano.nivel - mitad && d.desdeZ <= plano.nivel + mitad;
  return seSolapan && Math.abs(e.cx) < MITAD_GROSOR_HAZ_MM + d.radio;
}

export interface ParametrosShader extends ElementosEnImagen {
  // Geometría de la imagen en píxeles reales del buffer (CSS px × ratio)
  resolucion: [number, number];
  escala: number;
  izquierda: number;
  anchoMm: number;
  profundidadMm: number;
  // Ajustes
  gananciaDb: number;
  focoMm: number;
  // Estado del paciente y la sonda
  posicionSondaMm: number;
  lateralMm: number;
  respiracion: number;
  subcutaneoMm: number;
  vena: Vec4;
  arteria: Vec4;
  ecm0: Vec4;
  ecm1: Vec4;
  tiroides: Vec4;
  hayTiroides: number;
  trombo: number; // fracción de la vena ocupada por trombo
  pleura: [number, number, number];
  // Doppler color
  doppler: number; // 1 = encendido
  pulso: number; // 0 (diástole) a 1 (pico sistólico)
  flujoVena: number; // 0 (sin flujo, vena colapsada) a 1
  tiempo: number; // s, para el parpadeo propio del Doppler
  // Eje largo: 1 = la sonda está girada; la anatomía viene por columnas
  longitudinal: number;
  cortesEjeLargo: Float32Array | null;
}

export interface EstadoFisiologico {
  lateralMm: number;
  respiracion: number;
  pulso: number;
  tiempo: number;
}

const aVec4 = (e: Elipse): Vec4 => [e.cx, e.cy, e.rx, e.ry];

const SIN_TIROIDES: Vec4 = [0, 0, 1, 1];

export function parametrosShader(
  corte: Corte, ajustes: AjustesUS, vista: Vista, ratio: number,
  anchoBufferPx: number, altoBufferPx: number, fisio: EstadoFisiologico,
  elementos: ElementosEnImagen = SIN_ELEMENTOS, cortesEjeLargo: Float32Array | null = null,
): ParametrosShader {
  const { lateralMm, respiracion, pulso, tiempo } = fisio;
  const { arteria, tiroides, pleura } = corte;
  return {
    resolucion: [anchoBufferPx, altoBufferPx],
    escala: vista.escala * ratio,
    izquierda: vista.izquierda * ratio,
    anchoMm: ANCHO_SONDA_MM,
    profundidadMm: ajustes.profundidadMm,
    gananciaDb: ajustes.gananciaDb,
    focoMm: FOCO_MM,
    posicionSondaMm: corte.posicionMm,
    lateralMm,
    respiracion,
    subcutaneoMm: corte.subcutaneo.profundidadMm,
    vena: aVec4(corte.vena),
    arteria: [arteria.cx, arteria.cy, arteria.r, arteria.r],
    ecm0: aVec4(corte.ecm[0]),
    ecm1: aVec4(corte.ecm[1]),
    tiroides: tiroides ? aVec4(tiroides) : SIN_TIROIDES,
    hayTiroides: tiroides ? 1 : 0,
    trombo: corte.tromboVena,
    pleura: [pleura.profundidadMm, pleura.verticeX, pleura.curvatura],
    doppler: ajustes.doppler ? 1 : 0,
    pulso,
    // El flujo cae con el cuadrado de la apertura (menos área y más resistencia)
    flujoVena: corte.aperturaVena * corte.aperturaVena,
    tiempo,
    ...elementos,
    longitudinal: cortesEjeLargo ? 1 : 0,
    cortesEjeLargo,
  };
}
