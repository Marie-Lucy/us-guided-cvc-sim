// Controlador de calidad según el tiempo de cuadro. Puro: recibe los ms de
// cada cuadro y decide la escala de resolución.

import * as R from '../config/rendimiento';
import { limitar } from './matematica';

export interface Calidad { escala: number; sombras: boolean }

export interface ControlRendimiento {
  // Devuelve la nueva calidad si cambió, o null
  registrar: (msCuadro: number) => Calidad | null;
  calidad: () => Calidad;
}

export function crearControlRendimiento(): ControlRendimiento {
  let media: number | null = null;
  let cuadros = 0;
  let escala = R.ESCALA_MAXIMA;
  const calidad = (): Calidad => ({ escala, sombras: escala >= R.ESCALA_SIN_SOMBRAS });

  return {
    calidad,
    registrar: (ms) => {
      if (!(ms > 0) || ms > R.MS_CUADRO_IGNORADO) return null;
      media = media === null ? ms : media + R.SUAVIZADO_TIEMPO_CUADRO * (ms - media);
      if (++cuadros < R.CUADROS_ENTRE_AJUSTES) return null;
      cuadros = 0;
      let nueva = escala;
      if (media > R.MS_CUADRO_LENTO) nueva = escala * R.FACTOR_BAJAR;
      else if (media < R.MS_CUADRO_RAPIDO) nueva = escala * R.FACTOR_SUBIR;
      nueva = limitar(nueva, R.ESCALA_MINIMA, R.ESCALA_MAXIMA);
      if (Math.abs(nueva - escala) < 1e-3) return null;
      escala = nueva;
      return calidad();
    },
  };
}
