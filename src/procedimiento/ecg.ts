// Trazo de ECG (derivación II) con extrasístoles ventriculares.
// Cada latido es una suma de ondas gaussianas: P, Q, R, S y T.
// Una extrasístole llega antes, sin onda P, con un QRS ancho y una T invertida.

import { FRECUENCIA_CARDIACA_LPM, S_POR_MIN } from '../config/anatomia';
import { ECG_PERIODO_EXTRASISTOLE, ECG_PERIODO_EXTRASISTOLE_GRAVE } from '../config/procedimiento';

interface Onda { centro: number; ancho: number; amplitud: number } // s, s, mV

const onda = (t: number, o: Onda): number => o.amplitud * Math.exp(-(((t - o.centro) / o.ancho) ** 2));

// Latido sinusal: tiempos desde el inicio del ciclo
const NORMAL: Onda[] = [
  { centro: 0.1, ancho: 0.025, amplitud: 0.12 }, // P
  { centro: 0.2, ancho: 0.008, amplitud: -0.1 }, // Q
  { centro: 0.22, ancho: 0.011, amplitud: 1.0 }, // R
  { centro: 0.245, ancho: 0.01, amplitud: -0.25 }, // S
  { centro: 0.45, ancho: 0.05, amplitud: 0.3 }, // T
];

// Extrasístole ventricular: prematura, sin P, QRS ancho y T opuesta
const EXTRASISTOLE: Onda[] = [
  { centro: 0.08, ancho: 0.035, amplitud: 1.3 },
  { centro: 0.15, ancho: 0.03, amplitud: -0.45 },
  { centro: 0.34, ancho: 0.07, amplitud: -0.4 },
];

export const DURACION_CICLO_S = S_POR_MIN / FRECUENCIA_CARDIACA_LPM;

// ¿Este latido (índice) es una extrasístole?
export function esExtrasistole(latido: number, nivel: 0 | 1 | 2): boolean {
  if (nivel === 0) return false;
  const periodo = nivel === 2 ? ECG_PERIODO_EXTRASISTOLE_GRAVE : ECG_PERIODO_EXTRASISTOLE;
  return latido % periodo === periodo - 1;
}

// Voltaje (mV) en el instante t. 'nivel' puede cambiar con el tiempo: se pasa
// una función para que cada latido use el nivel que había cuando empezó.
export function voltajeEcg(t: number, nivelEn: (t: number) => 0 | 1 | 2): number {
  const latido = Math.floor(t / DURACION_CICLO_S);
  const inicio = latido * DURACION_CICLO_S;
  const fase = t - inicio;
  const ondas = esExtrasistole(latido, nivelEn(inicio)) ? EXTRASISTOLE : NORMAL;
  return ondas.reduce((suma, o) => suma + onda(fase, o), 0);
}
