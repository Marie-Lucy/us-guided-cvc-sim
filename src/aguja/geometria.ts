// Geometría de la aguja como segmento recto (funciones puras).

import { GRADOS_A_RAD } from '../config/aguja';

// Punto en el marco anatómico: x medial, y profundidad, z altura sobre la clavícula.
export interface P3 { x: number; y: number; z: number }
export interface P2 { x: number; y: number }

// Dirección unitaria de la aguja.
//   angulo: inclinación respecto de la piel (30–60°)
//   orientacion: giro hacia medial (+) o lateral (−)
// La aguja entra por encima de la sonda y avanza hacia la clavícula (z decreciente).
export function direccionAguja(anguloGrados: number, orientacionGrados: number): P3 {
  const a = anguloGrados * GRADOS_A_RAD;
  const o = orientacionGrados * GRADOS_A_RAD;
  const horizontal = Math.cos(a);
  return { x: horizontal * Math.sin(o), y: Math.sin(a), z: -horizontal * Math.cos(o) };
}

// Punto a t milímetros de la entrada.
export const puntoAguja = (e: P3, d: P3, t: number): P3 => ({ x: e.x + t * d.x, y: e.y + t * d.y, z: e.z + t * d.z });

export interface Cruce {
  t: number; // distancia desde la entrada hasta el centro del plano del haz
  a: P2; // tramo visible, en coordenadas de la imagen
  b: P2;
  incluyePunta: boolean; // si la punta está dentro del haz (no se distingue en la imagen)
}

// Plano del haz según cómo está apoyada la sonda.
//   transversal:  plano z = nivel   (normal (0,0,1)); en la imagen x_img = x − lateral
//   longitudinal: plano x = lateral (normal (1,0,0)); en la imagen x_img = z − nivel
//                 (positivo = hacia la cabeza, a la izquierda de la pantalla)
export interface Plano { orientacion: 'transversal' | 'longitudinal'; nivel: number; lateral: number }

const CASI_PARALELO = 1e-6;

// Coordenada del punto a lo largo de la normal del plano, y la del plano mismo
const sobreNormal = (p: P3, plano: Plano): number => (plano.orientacion === 'transversal' ? p.z : p.x);
const posicionPlano = (plano: Plano): number => (plano.orientacion === 'transversal' ? plano.nivel : plano.lateral);

export function aImagen(p: P3, plano: Plano): P2 {
  return plano.orientacion === 'transversal'
    ? { x: p.x - plano.lateral, y: p.y }
    : { x: p.z - plano.nivel, y: p.y };
}

/**
 * Parte de la aguja (o de cualquier instrumento recto) que cae dentro del haz.
 * Intersección recta–plano:  t = ((p₀ − e) · n) / (d · n)
 * Como n es un eje (z o x), el producto punto se queda con una sola coordenada:
 *   transversal:  t = (nivel − e.z) / d.z
 *   longitudinal: t = (lateral − e.x) / d.x
 * Se muestra el tramo entre las dos caras de la lámina del haz, recortado a [0, largo].
 */
export function cruceConPlano(e: P3, d: P3, largoMm: number, plano: Plano, mitadGrosor: number): Cruce | null {
  if (largoMm <= 0) return null;
  const e0 = sobreNormal(e, plano);
  const dn = sobreNormal(d, plano);
  const c = posicionPlano(plano);
  let t0: number;
  let t1: number;
  let t: number;
  if (Math.abs(dn) < CASI_PARALELO) {
    // Paralela al plano: o está toda dentro de la lámina (en plano) o no se ve
    if (Math.abs(e0 - c) > mitadGrosor) return null;
    t0 = 0;
    t1 = largoMm;
    t = largoMm / 2;
  } else {
    t = (c - e0) / dn;
    const ta = (c - mitadGrosor - e0) / dn;
    const tb = (c + mitadGrosor - e0) / dn;
    t0 = Math.max(Math.min(ta, tb), 0);
    t1 = Math.min(Math.max(ta, tb), largoMm);
  }
  if (t0 > t1) return null;
  return {
    t,
    a: aImagen(puntoAguja(e, d, t0), plano),
    b: aImagen(puntoAguja(e, d, t1), plano),
    incluyePunta: t1 >= largoMm,
  };
}

// Atajo para la vista transversal (la de las etapas anteriores).
export function cruceConHaz(
  e: P3, d: P3, insertadaMm: number, nivelSonda: number, lateralSonda: number, mitadGrosor: number,
): Cruce | null {
  return cruceConPlano(e, d, insertadaMm, { orientacion: 'transversal', nivel: nivelSonda, lateral: lateralSonda }, mitadGrosor);
}
