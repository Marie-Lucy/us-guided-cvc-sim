// Estado de la sonda: dónde está y cuánto presiona.

import {
  POSICION_SONDA_MIN_MM, POSICION_SONDA_MAX_MM, POSICION_SONDA_INICIAL_MM,
  LATERAL_SONDA_MIN_MM, LATERAL_SONDA_MAX_MM,
  VELOCIDAD_COMPRESION_POR_S, VELOCIDAD_LIBERACION_POR_S,
} from '../config/anatomia';
import { limitar } from '../core/matematica';

export type Orientacion = 'transversal' | 'longitudinal';

export interface Sonda {
  posicionMm: number; // distancia a la clavícula
  lateralMm: number; // desplazamiento horizontal (+ medial)
  compresion: number; // 0 a 1, la que se usa en la física
  // transversal: el haz corta el cuello de través. longitudinal: girada 90°, a lo largo del vaso
  orientacion: Orientacion;
}

const sonda = {
  posicionMm: POSICION_SONDA_INICIAL_MM,
  lateralMm: 0,
  compresionDeslizador: 0, // control fijo (deslizador, útil en celular)
  compresionTecla: 0, // sube mientras se mantiene la tecla
  teclaPresionada: false,
  orientacion: 'transversal' as Orientacion,
};

export function obtenerSonda(): Readonly<Sonda> {
  return {
    posicionMm: sonda.posicionMm,
    lateralMm: sonda.lateralMm,
    compresion: Math.max(sonda.compresionDeslizador, sonda.compresionTecla),
    orientacion: sonda.orientacion,
  };
}

export function moverSonda(posicionMm: number, lateralMm = sonda.lateralMm): void {
  sonda.posicionMm = limitar(posicionMm, POSICION_SONDA_MIN_MM, POSICION_SONDA_MAX_MM);
  sonda.lateralMm = limitar(lateralMm, LATERAL_SONDA_MIN_MM, LATERAL_SONDA_MAX_MM);
}

export function desplazarSonda(dPosicionMm: number, dLateralMm: number): void {
  moverSonda(sonda.posicionMm + dPosicionMm, sonda.lateralMm + dLateralMm);
}

export function fijarCompresion(valor: number): void {
  sonda.compresionDeslizador = limitar(valor, 0, 1);
}

export function presionarTecla(presionada: boolean): void {
  sonda.teclaPresionada = presionada;
}

// La compresión con tecla sube y baja de forma gradual, como una mano.
export function actualizarSonda(dt: number): void {
  const cambio = sonda.teclaPresionada ? VELOCIDAD_COMPRESION_POR_S * dt : -VELOCIDAD_LIBERACION_POR_S * dt;
  sonda.compresionTecla = limitar(sonda.compresionTecla + cambio, 0, 1);
}

export function rotarSonda(): void {
  sonda.orientacion = sonda.orientacion === 'transversal' ? 'longitudinal' : 'transversal';
}

export function reiniciarSonda(): void {
  sonda.orientacion = 'transversal';
  moverSonda(POSICION_SONDA_INICIAL_MM, 0);
  sonda.compresionDeslizador = 0;
  sonda.compresionTecla = 0;
  sonda.teclaPresionada = false;
}
