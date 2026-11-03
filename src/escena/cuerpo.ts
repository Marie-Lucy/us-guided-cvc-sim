// Geometría del cuello en 3D, como funciones puras (sin Three.js).
// La piel es una superficie paramétrica: ángulo alrededor del cuello × altura z.
// Los relieves del ECM salen del mismo modelo anatómico que la ecografía,
// así lo que se ve en la piel coincide con lo que se ve en la imagen.

import { ANATOMIA_NORMAL, POSICION_SONDA_MIN_MM, POSICION_SONDA_MAX_MM } from '../config/anatomia';
import * as E from '../config/escena';
import { lerp, limitar, suavizar } from '../core/matematica';

export interface V3 { x: number; y: number; z: number }

const gauss = (d: number, ancho: number): number => Math.exp(-(d * d) / (ancho * ancho));

// Ángulo del centro de la sonda (lateral = 0) a cada altura.
export function anguloCentro(z: number): number {
  return E.ANGULO_SONDA_EN_CLAVICULA_RAD + E.INCLINACION_ECM_RAD_POR_MM * z;
}

// Separación y ancho de los haces del ECM a una altura, del modelo anatómico.
function geometriaEcm(z: number): { separacion: number; ancho: number } {
  const t = suavizar(POSICION_SONDA_MIN_MM, POSICION_SONDA_MAX_MM, z);
  const { bajo, alto } = ANATOMIA_NORMAL;
  return {
    separacion: lerp(bajo.ecmSeparacion, alto.ecmSeparacion, t),
    ancho: lerp(bajo.ecmRx, alto.ecmRx, t) * E.FACTOR_ANCHO_RELIEVE_ECM,
  };
}

// Cuánto sobresale la piel (mm) sobre el cilindro base en (ángulo, z).
export function relieve(angulo: number, z: number): number {
  const R = E.RADIO_CUELLO_MM;
  let h = 0;

  // Dos haces del ECM: medial (esternal) y lateral (clavicular)
  const { separacion, ancho } = geometriaEcm(z);
  const centro = anguloCentro(z);
  const insercion = suavizar(E.Z_INSERCION_ECM_MM - 12, E.Z_INSERCION_ECM_MM, z);
  for (const signo of [-1, 1]) {
    const anguloHaz = centro + (signo * separacion) / R; // + = lateral
    h += E.ALTURA_ECM_MM * insercion * gauss((angulo - anguloHaz) * R, ancho);
  }

  // Clavícula: una barra bajo la piel que baja un poco hacia el hombro
  if (angulo > 0 && angulo < E.ANGULO_CLAVICULA_MAX_RAD) {
    const zClavicula = E.Z_CLAVICULA_MEDIAL_MM - E.CAIDA_CLAVICULA_MM_POR_RAD * angulo;
    const extremo = 1 - suavizar(E.ANGULO_CLAVICULA_MAX_RAD - 0.4, E.ANGULO_CLAVICULA_MAX_RAD, angulo);
    h += E.ALTURA_CLAVICULA_MM * extremo * gauss(z - zClavicula, E.ANCHO_CLAVICULA_MM);
  }

  // Horquilla esternal y laringe en la línea media
  h -= E.PROFUNDIDAD_HORQUILLA_MM * gauss(angulo * R, E.ANCHO_HORQUILLA_MM) * gauss(z - E.Z_CLAVICULA_MEDIAL_MM, E.ANCHO_HORQUILLA_MM);
  h += E.ALTURA_LARINGE_MM * gauss(angulo * R, E.ANCHO_LARINGE_MM) * gauss(z - E.Z_LARINGE_MM, E.ANCHO_LARINGE_MM * 1.5);
  return h;
}

// Punto de la piel en (ángulo, z), más un hundimiento opcional hacia adentro.
// El ángulo es anatómico (0 = línea media); el giro de la cabeza rota el cuello.
export function puntoPiel(angulo: number, z: number, hundimientoMm = 0): V3 {
  const r = E.RADIO_CUELLO_MM + relieve(angulo, z) - hundimientoMm;
  const giro = angulo - E.ROTACION_CABEZA_RAD;
  return { x: r * Math.sin(giro), y: r * Math.cos(giro), z };
}

const ITERACIONES_ALTURA = 12;

// Altura de la piel del cuello vista desde arriba en (x, z), con sus relieves.
// Devuelve null si x queda fuera del cuello.
export function alturaCuello(x: number, z: number): number | null {
  let giro = 0;
  let r = E.RADIO_CUELLO_MM;
  for (let i = 0; i < ITERACIONES_ALTURA; i++) {
    const s = x / r;
    if (Math.abs(s) >= 1) return null;
    giro = Math.asin(s);
    r = E.RADIO_CUELLO_MM + relieve(giro + E.ROTACION_CABEZA_RAD, z);
  }
  return r * Math.cos(giro);
}

// ---- Sonda ↔ superficie ----

// (posición sobre la clavícula, desplazamiento lateral) → (ángulo, z) en la piel.
export function sondaAPiel(posicionMm: number, lateralMm: number): { angulo: number; z: number } {
  const z = posicionMm;
  return { angulo: anguloCentro(z) - lateralMm / E.RADIO_CUELLO_MM, z };
}

// Inversa: un punto de la piel → posición y lateral de la sonda (sin limitar).
export function pielASonda(angulo: number, z: number): { posicionMm: number; lateralMm: number } {
  return { posicionMm: z, lateralMm: (anguloCentro(z) - angulo) * E.RADIO_CUELLO_MM };
}

// Coordenadas de textura (u, v en 0..1) de la malla de piel → (ángulo, z).
export function uvAPiel(u: number, v: number): { angulo: number; z: number } {
  return {
    angulo: lerp(E.ANGULO_PIEL_MIN_RAD, E.ANGULO_PIEL_MAX_RAD, u),
    z: lerp(E.Z_PIEL_MIN_MM, E.Z_PIEL_MAX_MM, v),
  };
}

const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cruz = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export const normalizar = (a: V3): V3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

const PASO_DERIVADA = 0.5; // mm

// Sistema de ejes de la sonda apoyada en (ángulo, z):
//   largo  = dirección de la huella (alrededor del cuello, hacia lateral)
//   normal = perpendicular a la piel, hacia afuera
//   cuello = a lo largo del cuello
export function ejesEnPiel(angulo: number, z: number): { punto: V3; largo: V3; normal: V3; cuello: V3 } {
  const R = E.RADIO_CUELLO_MM;
  const dA = PASO_DERIVADA / R;
  const largo = normalizar(sub(puntoPiel(angulo + dA, z), puntoPiel(angulo - dA, z)));
  const cuello = normalizar(sub(puntoPiel(angulo, z + PASO_DERIVADA), puntoPiel(angulo, z - PASO_DERIVADA)));
  const normal = normalizar(cruz(cuello, largo));
  return { punto: puntoPiel(angulo, z), largo, normal, cuello };
}

// ---- Altura del cuerpo bajo el campo estéril ----

// Máximo suave: une dos superficies sin un pliegue en ángulo.
function maxSuave(a: number, b: number, k: number): number {
  const h = limitar(0.5 + (0.5 * (a - b)) / k, 0, 1);
  return lerp(b, a, h) + k * h * (1 - h);
}

export function alturaCuerpo(x: number, z: number): number {
  const cuello = alturaCuello(x, z) ?? E.ALTURA_CAMA_MM;
  const anchoTorax = 1 - (x / E.SEMIANCHO_TORAX_MM) ** 2;
  const torax = anchoTorax > 0
    ? E.ALTURA_TORAX_MM * Math.sqrt(anchoTorax) * suavizar(E.Z_INICIO_TORAX_MM, E.Z_TORAX_COMPLETO_MM, z)
    : E.ALTURA_CAMA_MM;
  const c = E.CENTRO_CABEZA;
  const dentro = E.RADIO_CABEZA_MM ** 2 - (x - c.x) ** 2 - (z - c.z) ** 2;
  const cabeza = dentro > 0 ? c.y + Math.sqrt(dentro) : E.ALTURA_CAMA_MM;
  const k = E.SUAVIDAD_UNIONES_MM;
  return maxSuave(maxSuave(maxSuave(cuello, torax, k), cabeza, k), E.ALTURA_CAMA_MM, k);
}

// ¿Está (x, z) dentro de la ventana del campo estéril? Rectángulo de esquinas redondeadas.
export function dentroVentana(x: number, z: number, margen = 0): boolean {
  const v = E.VENTANA;
  const cx = (v.xMin + v.xMax) / 2;
  const cz = (v.zMin + v.zMax) / 2;
  const mx = (v.xMax - v.xMin) / 2 - v.radio + margen;
  const mz = (v.zMax - v.zMin) / 2 - v.radio + margen;
  const dx = Math.max(Math.abs(x - cx) - mx, 0);
  const dz = Math.max(Math.abs(z - cz) - mz, 0);
  return Math.hypot(dx, dz) < v.radio;
}

// Distancia aproximada (mm) desde (x, z) al borde de la ventana, hacia afuera.
export function distanciaVentana(x: number, z: number): number {
  const v = E.VENTANA;
  const dx = Math.max(v.xMin - x, x - v.xMax, 0);
  const dz = Math.max(v.zMin - z, z - v.zMax, 0);
  return Math.hypot(dx, dz);
}

// Punto del marco anatómico de la aguja (x medial, y profundidad, z altura sobre
// la clavícula) → coordenadas del mundo 3D: se ubica en la piel y se hunde por la normal.
export function anatomicoAMundo(p: { x: number; y: number; z: number }): V3 {
  const { angulo, z } = sondaAPiel(p.z, p.x);
  const { punto, normal } = ejesEnPiel(angulo, z);
  return { x: punto.x - normal.x * p.y, y: punto.y - normal.y * p.y, z: punto.z - normal.z * p.y };
}
