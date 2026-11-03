// Modelo paramétrico del cuello.
// Dada la posición de la sonda y el instante, devuelve el corte transversal
// con todas las estructuras en milímetros. No dibuja nada.

import {
  ANATOMIA_NORMAL, POSICION_SONDA_MIN_MM, POSICION_SONDA_MAX_MM, TIROIDES_FACTOR_MINIMO,
  FRECUENCIA_CARDIACA_LPM, FRECUENCIA_RESPIRATORIA_RPM, S_POR_MIN,
  FRACCION_SISTOLE, TAU_DIASTOLE, AMPLITUD_PULSO_ARTERIAL,
  AMPLITUD_RESPIRATORIA_VENA, FRACCION_RESPIRATORIA_HORIZONTAL,
  PRESION_SONDA_MAX_MMHG, PRESION_VENOSA_MMHG, PRESION_ARTERIAL_DIASTOLICA_MMHG, AUMENTO_PRESION_VALSALVA_MMHG,
  RANGO_COLAPSO_MMHG, FRACCION_MINIMA_COLAPSO, ENSANCHAMIENTO_AL_COLAPSAR,
  DISTENSIBILIDAD_VENA_POR_MMHG, FRACCION_DISTENSION_HORIZONTAL,
  HUNDIMIENTO_TEJIDO_MAX_MM, ESCALA_HUNDIMIENTO_MM,
  type Anatomia, type FisiologiaPaciente, type ParametrosTrombo, type NivelAnatomico, type ParametrosTiroides, type ParametrosPleura,
} from '../config/anatomia';
import { TIENDA_MAXIMA_VENA_MM } from '../config/aguja';
import { limitar, lerp, suavizar } from '../core/matematica';

export interface Elipse { cx: number; cy: number; rx: number; ry: number }
export interface Circulo { cx: number; cy: number; r: number }
export interface Pleura { profundidadMm: number; verticeX: number; curvatura: number }

export interface Corte {
  posicionMm: number;
  subcutaneo: { profundidadMm: number };
  ecm: [Elipse, Elipse]; // [haz lateral (clavicular), haz medial (esternal)]
  vena: Elipse;
  arteria: Circulo;
  tiroides: Elipse | null;
  pleura: Pleura;
  aperturaVena: number; // 1 = abierta, ~0 = colapsada (para el flujo del Doppler)
  tiendaMaximaVenaMm: number; // cuánto se hunde la pared venosa antes de perforarse
  tromboVena: number; // fracción de la altura de la vena ocupada por trombo (0 = libre, 1 = oclusivo)
}

// Cuánto trombo hay a una altura del cuello (0 si el paciente no tiene).
export function ocupacionTrombo(t: ParametrosTrombo | undefined, posicionMm: number): number {
  if (!t) return 0;
  return t.ocupacion * suavizar(t.desdeMm - t.transicionMm, t.desdeMm, posicionMm)
    * (1 - suavizar(t.hastaMm, t.hastaMm + t.transicionMm, posicionMm));
}

// ¿El punto (x, y) cae dentro del trombo de esta vena? El trombo se apoya en la pared
// posterior y sube hasta ocupar la fracción indicada de la altura local de la luz.
export function enTrombo(vena: Elipse, trombo: number, x: number, y: number): boolean {
  if (trombo <= 0) return false;
  const u = (x - vena.cx) / vena.rx;
  if (Math.abs(u) >= 1) return false;
  const mitad = vena.ry * Math.sqrt(1 - u * u);
  const fondo = vena.cy + mitad;
  return y <= fondo && y >= fondo - trombo * 2 * mitad;
}

// Fisiología del paciente, completando con los valores normales
export function fisiologiaDe(anatomia: Anatomia): FisiologiaPaciente {
  return {
    presionVenosaMmHg: PRESION_VENOSA_MMHG,
    amplitudRespiratoriaVena: AMPLITUD_RESPIRATORIA_VENA,
    tiendaMaximaVenaMm: TIENDA_MAXIMA_VENA_MM,
    ...anatomia.fisiologia,
  };
}

export interface OpcionesCorte {
  lateralMm?: number; // desplazamiento de la sonda hacia medial (+) o lateral (−)
  anatomia?: Anatomia; // paciente (por defecto, anatomía normal)
  compresion?: number; // 0 = apoyada sin presión, 1 = presión máxima
  valsalva?: number; // 0 = respiración normal, 1 = Valsalva completo
}

// ---------------------------------------------------------------------
// Ley del tubo
// ---------------------------------------------------------------------

// Fracción del radio vertical que queda abierta según la presión transmural
// (presión interna − presión de la sonda). Positiva: abierto. Negativa: colapsa.
export function aperturaPorPresion(presionTransmuralMmHg: number): number {
  return limitar(1 + presionTransmuralMmHg / RANGO_COLAPSO_MMHG, FRACCION_MINIMA_COLAPSO, 1);
}

export const presionSonda = (compresion: number): number => limitar(compresion, 0, 1) * PRESION_SONDA_MAX_MMHG;

export const presionVenosa = (valsalva: number, basal = PRESION_VENOSA_MMHG): number =>
  basal + limitar(valsalva, 0, 1) * AUMENTO_PRESION_VALSALVA_MMHG;

// La sonda hunde la piel: cada estructura sube, más cuanto más superficial.
export function hundimiento(yMm: number, compresion: number): number {
  return HUNDIMIENTO_TEJIDO_MAX_MM * limitar(compresion, 0, 1) * (1 - Math.exp(-yMm / ESCALA_HUNDIMIENTO_MM));
}

// ---------------------------------------------------------------------
// Fisiología en el tiempo
// ---------------------------------------------------------------------

// Onda de pulso arterial entre 0 (diástole) y 1 (pico sistólico).
// Subida rápida (seno al cuadrado) y caída exponencial lenta, como un pulso real.
export function pulsoCardiaco(tSeg: number, fcLpm = FRECUENCIA_CARDIACA_LPM): number {
  const fase = (tSeg * fcLpm / S_POR_MIN) % 1;
  if (fase < FRACCION_SISTOLE) {
    return Math.sin((Math.PI / 2) * (fase / FRACCION_SISTOLE)) ** 2;
  }
  return Math.exp(-(fase - FRACCION_SISTOLE) / TAU_DIASTOLE);
}

// Ciclo respiratorio entre -1 (espiración) y 1 (inspiración máxima).
export function cicloRespiratorio(tSeg: number, frRpm = FRECUENCIA_RESPIRATORIA_RPM): number {
  return Math.sin(2 * Math.PI * tSeg * frRpm / S_POR_MIN);
}

// ---------------------------------------------------------------------
// Corte transversal
// ---------------------------------------------------------------------

type AX = (xAnatomico: number) => number;
type AY = (yAnatomico: number) => number;

function interpolarNivel(bajo: NivelAnatomico, alto: NivelAnatomico, t: number): NivelAnatomico {
  const resultado = {} as NivelAnatomico;
  for (const clave of Object.keys(bajo) as (keyof NivelAnatomico)[]) {
    resultado[clave] = lerp(bajo[clave], alto[clave], t);
  }
  return resultado;
}

export function corteTransversal(posicionMm: number, tSeg: number, opciones: OpcionesCorte = {}): Corte {
  const { lateralMm = 0, anatomia = ANATOMIA_NORMAL, compresion = 0, valsalva = 0 } = opciones;
  const pos = limitar(posicionMm, POSICION_SONDA_MIN_MM, POSICION_SONDA_MAX_MM);

  // 0 junto a la clavícula, 1 arriba del cuello, con transición suave
  const altura = suavizar(POSICION_SONDA_MIN_MM, POSICION_SONDA_MAX_MM, pos);
  const nivel = interpolarNivel(anatomia.bajo, anatomia.alto, altura);

  // Al mover la sonda hacia medial, las estructuras se ven corridas hacia lateral
  const x: AX = (xAnatomico) => xAnatomico - lateralMm;
  // Al comprimir, todo sube un poco
  const y: AY = (yAnatomico) => yAnatomico - hundimiento(yAnatomico, compresion);

  const psonda = presionSonda(compresion);
  const fisio = fisiologiaDe(anatomia);
  const trombo = ocupacionTrombo(anatomia.trombo, pos);
  const { vena, apertura } = venaYugular(nivel, x, y, tSeg, psonda, valsalva, fisio, trombo);

  return {
    posicionMm: pos,
    subcutaneo: { profundidadMm: y(anatomia.grosorSubcutaneoMm) },
    ecm: musculoEsternocleidomastoideo(nivel, x, y),
    vena,
    arteria: arteriaCarotida(nivel, x, y, tSeg, psonda),
    tiroides: tiroides(anatomia.tiroides, pos, x, y),
    pleura: pleura(anatomia.pleura, pos, x, y),
    aperturaVena: apertura,
    tiendaMaximaVenaMm: fisio.tiendaMaximaVenaMm,
    tromboVena: trombo,
  };
}

// Dos haces (clavicular y esternal) que se juntan en un vientre al subir.
function musculoEsternocleidomastoideo(nivel: NivelAnatomico, x: AX, y: AY): [Elipse, Elipse] {
  const arriba = y(nivel.ecmY - nivel.ecmRy);
  const abajo = y(nivel.ecmY + nivel.ecmRy);
  const haz = (signo: number): Elipse => ({
    cx: x(signo * nivel.ecmSeparacion), cy: (arriba + abajo) / 2, rx: nivel.ecmRx, ry: (abajo - arriba) / 2,
  });
  return [haz(-1), haz(1)];
}

// Yugular: cambia con la respiración, se distiende con Valsalva y colapsa con la sonda.
function venaYugular(
  nivel: NivelAnatomico, x: AX, y: AY, tSeg: number, psonda: number, valsalva: number, fisio: FisiologiaPaciente,
  trombo: number,
): { vena: Elipse; apertura: number } {
  // Un segmento trombosado es rígido: no cambia con la respiración ni con Valsalva
  const libre = 1 - trombo;
  // En inspiración la presión intratorácica baja y la vena se vacía un poco.
  // Durante Valsalva el paciente no respira.
  const respiracion = -fisio.amplitudRespiratoriaVena * cicloRespiratorio(tSeg) * (1 - limitar(valsalva, 0, 1)) * libre;
  const pvenosa = presionVenosa(valsalva, fisio.presionVenosaMmHg);
  const distension = DISTENSIBILIDAD_VENA_POR_MMHG * (pvenosa - fisio.presionVenosaMmHg) * libre;

  const ryAbierta = nivel.venaRy * (1 + respiracion) * (1 + distension);
  const rxAbierta = nivel.venaRx * (1 + respiracion * FRACCION_RESPIRATORIA_HORIZONTAL)
    * (1 + distension * FRACCION_DISTENSION_HORIZONTAL);

  // Colapso: la sonda aplasta la vena desde arriba; la pared posterior no se mueve.
  // El trombo ocupa lugar: la vena no puede aplastarse por debajo de su altura.
  const apertura = Math.max(aperturaPorPresion(pvenosa - psonda), trombo);
  const fondo = y(nivel.venaY + ryAbierta);
  const ry = ryAbierta * apertura;
  return {
    vena: {
      cx: x(nivel.venaX),
      cy: fondo - ry,
      rx: rxAbierta * (1 + ENSANCHAMIENTO_AL_COLAPSAR * (1 - apertura)),
      ry,
    },
    apertura,
  };
}

// Círculo cuyo radio sigue la onda de pulso. Con su presión, la sonda no lo colapsa.
function arteriaCarotida(nivel: NivelAnatomico, x: AX, y: AY, tSeg: number, psonda: number): Circulo {
  const apertura = aperturaPorPresion(PRESION_ARTERIAL_DIASTOLICA_MMHG - psonda);
  const r = nivel.arteriaR * (1 + AMPLITUD_PULSO_ARTERIAL * pulsoCardiaco(tSeg)) * apertura;
  return { cx: x(nivel.arteriaX), cy: y(nivel.arteriaY), r };
}

// Lóbulo derecho: aparece y desaparece suavemente según la altura.
function tiroides(t: ParametrosTiroides, pos: number, x: AX, y: AY): Elipse | null {
  const factor = suavizar(t.apareceDesdeMm, t.completaDesdeMm, pos)
    * (1 - suavizar(t.empiezaAFaltarMm, t.desapareceMm, pos));
  if (factor < TIROIDES_FACTOR_MINIMO) return null;
  return { cx: x(t.x), cy: y(t.y), rx: t.rx * factor, ry: t.ry * factor };
}

// Parábola que se abre hacia abajo desde el vértice de la cúpula.
function pleura(p: ParametrosPleura, pos: number, x: AX, y: AY): Pleura {
  return {
    profundidadMm: y(p.profundidadEnClaviculaMm + p.hundimientoPorMm * pos),
    verticeX: x(p.verticeX),
    curvatura: p.curvatura,
  };
}

// Profundidad de la pleura en una posición horizontal x del corte.
export function profundidadPleura(p: Pleura, xMm: number): number {
  const dx = xMm - p.verticeX;
  return p.profundidadMm + p.curvatura * dx * dx;
}
