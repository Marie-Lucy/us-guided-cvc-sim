// Ajustes del ecógrafo que controla el usuario.

import {
  PROFUNDIDAD_MIN_MM, PROFUNDIDAD_MAX_MM, PROFUNDIDAD_PASO_MM, PROFUNDIDAD_INICIAL_MM,
  GANANCIA_MIN_DB, GANANCIA_MAX_DB, GANANCIA_PASO_DB, GANANCIA_INICIAL_DB,
} from '../config/ultrasonido';
import { limitar } from '../core/matematica';

export interface AjustesUS {
  gananciaDb: number;
  profundidadMm: number;
  etiquetas: boolean; // nombres de las estructuras sobre la imagen
  esquema: boolean; // vista didáctica en colores planos en vez de la ecografía
  doppler: boolean; // Doppler color sobre los vasos
}

const ajustes: AjustesUS = {
  gananciaDb: GANANCIA_INICIAL_DB,
  profundidadMm: PROFUNDIDAD_INICIAL_MM,
  etiquetas: false,
  esquema: false,
  doppler: false,
};

// Ajusta al paso más cercano dentro de los límites.
const aPaso = (v: number, min: number, max: number, paso: number): number =>
  limitar(min + Math.round((v - min) / paso) * paso, min, max);

export function obtenerAjustes(): Readonly<AjustesUS> {
  return { ...ajustes };
}

export function cambiarGanancia(db: number): void {
  ajustes.gananciaDb = aPaso(db, GANANCIA_MIN_DB, GANANCIA_MAX_DB, GANANCIA_PASO_DB);
}

export function cambiarProfundidad(mm: number): void {
  ajustes.profundidadMm = aPaso(mm, PROFUNDIDAD_MIN_MM, PROFUNDIDAD_MAX_MM, PROFUNDIDAD_PASO_MM);
}

export function cambiarEtiquetas(visibles: boolean): void {
  ajustes.etiquetas = visibles;
}

export function cambiarEsquema(activo: boolean): void {
  ajustes.esquema = activo;
}

export function cambiarDoppler(activo: boolean): void {
  ajustes.doppler = activo;
}

// Ganancia como porcentaje para mostrar (0 % = mínima, 100 % = máxima).
export function gananciaPorcentaje(db: number): number {
  return Math.round(((db - GANANCIA_MIN_DB) / (GANANCIA_MAX_DB - GANANCIA_MIN_DB)) * 100);
}
