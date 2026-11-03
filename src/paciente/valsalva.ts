// Maniobra de Valsalva: el paciente puja con la glotis cerrada unos segundos.
// Sube la presión venosa y la yugular se distiende.

import { VALSALVA_SUBIDA_S, VALSALVA_MESETA_S, VALSALVA_BAJADA_S } from '../config/anatomia';
import { suavizar } from '../core/matematica';

export const DURACION_VALSALVA_S = VALSALVA_SUBIDA_S + VALSALVA_MESETA_S + VALSALVA_BAJADA_S;

// Intensidad (0 a 1) a los t segundos de empezar la maniobra.
export function envolventeValsalva(t: number): number {
  if (t < 0 || t > DURACION_VALSALVA_S) return 0;
  const subida = suavizar(0, VALSALVA_SUBIDA_S, t);
  const bajada = 1 - suavizar(VALSALVA_SUBIDA_S + VALSALVA_MESETA_S, DURACION_VALSALVA_S, t);
  return Math.min(subida, bajada);
}

let tiempoDesdeInicio: number | null = null;

export function iniciarValsalva(): void {
  tiempoDesdeInicio = 0;
}

export function actualizarValsalva(dt: number): void {
  if (tiempoDesdeInicio === null) return;
  tiempoDesdeInicio += dt;
  if (tiempoDesdeInicio > DURACION_VALSALVA_S) tiempoDesdeInicio = null;
}

export function intensidadValsalva(): number {
  return tiempoDesdeInicio === null ? 0 : envolventeValsalva(tiempoDesdeInicio);
}

export function valsalvaActiva(): boolean {
  return tiempoDesdeInicio !== null;
}

export function reiniciarValsalva(): void {
  tiempoDesdeInicio = null;
}
