// Pacientes. Cada uno es una anatomía completa (más su fisiología): el resto
// del simulador no sabe de casos, solo recibe la anatomía.

import { ANATOMIA_NORMAL, type Anatomia, type NivelAnatomico } from '../config/anatomia';

export type IdCaso = 'normal' | 'obeso' | 'hipovolemico' | 'variante' | 'trombosis';

export interface Caso {
  id: IdCaso;
  nombre: string;
  dificultad: 'Básico' | 'Intermedio' | 'Avanzado';
  descripcion: string; // lo que el usuario ve al elegirlo
  claves: string; // qué tener en cuenta (se muestra en la evaluación)
  anatomia: Anatomia;
}

// Desplaza un nivel hacia lo profundo (todo lo que está bajo la grasa)
function masProfundo(n: NivelAnatomico, mm: number): NivelAnatomico {
  return { ...n, venaY: n.venaY + mm, arteriaY: n.arteriaY + mm, ecmY: n.ecmY + mm };
}

// ---- Obeso: 8 mm más de grasa subcutánea; todo queda más hondo ----
const GRASA_EXTRA_MM = 8;
const OBESO: Anatomia = {
  ...ANATOMIA_NORMAL,
  grosorSubcutaneoMm: ANATOMIA_NORMAL.grosorSubcutaneoMm + GRASA_EXTRA_MM,
  bajo: masProfundo(ANATOMIA_NORMAL.bajo, GRASA_EXTRA_MM),
  alto: masProfundo(ANATOMIA_NORMAL.alto, GRASA_EXTRA_MM),
  tiroides: { ...ANATOMIA_NORMAL.tiroides, y: ANATOMIA_NORMAL.tiroides.y + GRASA_EXTRA_MM },
  pleura: { ...ANATOMIA_NORMAL.pleura, profundidadEnClaviculaMm: ANATOMIA_NORMAL.pleura.profundidadEnClaviculaMm + GRASA_EXTRA_MM },
};

// ---- Hipovolémico: vena chica, aplanada, con poca presión ----
const FACTOR_ANCHO_HIPOVOLEMIA = 0.7;
const FACTOR_ALTO_HIPOVOLEMIA = 0.45;
const venaChica = (n: NivelAnatomico): NivelAnatomico => ({
  ...n, venaRx: n.venaRx * FACTOR_ANCHO_HIPOVOLEMIA, venaRy: n.venaRy * FACTOR_ALTO_HIPOVOLEMIA,
});
const HIPOVOLEMICO: Anatomia = {
  ...ANATOMIA_NORMAL,
  bajo: venaChica(ANATOMIA_NORMAL.bajo),
  alto: venaChica(ANATOMIA_NORMAL.alto),
  fisiologia: {
    presionVenosaMmHg: 1, // colapsa con casi nada de presión
    amplitudRespiratoriaVena: 0.3, // colapso inspiratorio marcado
    tiendaMaximaVenaMm: 6, // pared floja: se hunde mucho antes de perforarse
  },
};

// ---- Variante: la yugular queda encima de la carótida ----
// Atravesar la pared posterior de la vena lleva directo a la arteria.
const VARIANTE: Anatomia = {
  ...ANATOMIA_NORMAL,
  bajo: {
    ...ANATOMIA_NORMAL.bajo,
    venaX: 5, venaY: 15.5, venaRx: 7, venaRy: 4.5,
    arteriaX: 6, arteriaY: 26.5, arteriaR: 3.5,
  },
  alto: {
    ...ANATOMIA_NORMAL.alto,
    venaX: 5.5, venaY: 15.5, venaRx: 5.5, venaRy: 4,
    arteriaX: 6.8, arteriaY: 25.5, arteriaR: 3.5,
  },
  pleura: { ...ANATOMIA_NORMAL.pleura, profundidadEnClaviculaMm: 30 },
};

// ---- Trombosis: trombo oclusivo en el tramo bajo y medio de la yugular ----
// La vena no colapsa, se ve gris por dentro y no tiene flujo. Arriba queda un tramo libre.
const TROMBOSIS: Anatomia = {
  ...ANATOMIA_NORMAL,
  trombo: { desdeMm: -20, hastaMm: 34, transicionMm: 6, ocupacion: 1 },
};

export const CASOS: readonly Caso[] = [
  {
    id: 'normal',
    nombre: 'Anatomía normal',
    dificultad: 'Básico',
    descripcion: 'Yugular lateral y superficial a la carótida, bien llena.',
    claves: 'Identifica cada vaso (compresión, pulso, Doppler) y sigue la punta en todo momento.',
    anatomia: ANATOMIA_NORMAL,
  },
  {
    id: 'obeso',
    nombre: 'Paciente obeso',
    dificultad: 'Intermedio',
    descripcion: 'Mucha grasa subcutánea: los vasos quedan casi 1 cm más profundos.',
    claves: 'Aumenta la profundidad de la imagen, entra con más ángulo y no confundas el largo de aguja con la profundidad.',
    anatomia: OBESO,
  },
  {
    id: 'hipovolemico',
    nombre: 'Paciente hipovolémico',
    dificultad: 'Intermedio',
    descripcion: 'Yugular chica y aplanada, colapsa con la respiración y con muy poca presión.',
    claves: 'Comprime lo mínimo, usa Valsalva para llenarla y espera más tienda antes del flash.',
    anatomia: HIPOVOLEMICO,
  },
  {
    id: 'variante',
    nombre: 'Variante anatómica',
    dificultad: 'Avanzado',
    descripcion: 'La yugular está justo encima de la carótida.',
    claves: 'Atravesar la pared posterior es entrar a la carótida: avanza de a milímetros y busca un abordaje más lateral.',
    anatomia: VARIANTE,
  },
  {
    id: 'trombosis',
    nombre: 'Yugular trombosada',
    dificultad: 'Avanzado',
    descripcion: 'Un trombo ocupa el tramo bajo y medio de la yugular.',
    claves: 'Recorre la vena entera comprimiendo en cada nivel: donde no colapsa, se ve gris por dentro y no hay flujo, '
      + 'hay trombo. No punciones ahí; busca el tramo libre, más arriba (a más de 4 cm de la clavícula).',
    anatomia: TROMBOSIS,
  },
];

export const CASO_INICIAL: IdCaso = 'normal';

// Paciente sorpresa: uno al azar, sin decir cuál hasta la evaluación.
// 'azar' devuelve un número en [0, 1) (se pasa para poder testear).
export const SORPRESA = 'sorpresa';
export type EleccionCaso = IdCaso | typeof SORPRESA;

export function elegirSorpresa(azar: () => number = Math.random): IdCaso {
  const i = Math.min(Math.floor(azar() * CASOS.length), CASOS.length - 1);
  return CASOS[i].id;
}

export function caso(id: IdCaso): Caso {
  return CASOS.find((c) => c.id === id) ?? CASOS[0];
}
