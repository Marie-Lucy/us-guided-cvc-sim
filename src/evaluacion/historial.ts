// Historial de intentos guardado en el navegador. El almacenamiento se recibe
// como parámetro (puede no existir en modo privado), así se puede testear.

import type { IdCaso } from '../casos/casos';
import type { Nota } from './evaluacion';
import { CLAVE_HISTORIAL, HISTORIAL_MAXIMO } from '../config/examen';

export type Modo = 'practica' | 'examen';

export interface Intento {
  caso: IdCaso;
  modo: Modo;
  puntaje: number;
  exito: boolean;
  calificacion: string; // texto en el idioma de ese momento (intentos viejos solo tienen esto)
  nota?: Nota; // id de la nota: se traduce al mostrarla
  fecha: number; // ms desde 1970
}

export interface Almacen {
  getItem: (clave: string) => string | null;
  setItem: (clave: string, valor: string) => void;
}

export function almacenLocal(): Almacen | null {
  try {
    const prueba = '__cvc_prueba__';
    localStorage.setItem(prueba, '1');
    localStorage.removeItem(prueba);
    return localStorage;
  } catch {
    return null;
  }
}

const esIntento = (x: unknown): x is Intento => {
  const i = x as Intento;
  return !!i && typeof i.caso === 'string' && (i.modo === 'practica' || i.modo === 'examen')
    && typeof i.puntaje === 'number' && typeof i.exito === 'boolean' && typeof i.fecha === 'number';
};

// Lee el historial, descartando lo que no tenga la forma esperada. El más nuevo primero.
export function leerHistorial(a: Almacen | null): Intento[] {
  if (!a) return [];
  try {
    const datos: unknown = JSON.parse(a.getItem(CLAVE_HISTORIAL) ?? '[]');
    return Array.isArray(datos) ? datos.filter(esIntento) : [];
  } catch {
    return [];
  }
}

export function guardarIntento(a: Almacen | null, intento: Intento): Intento[] {
  const historial = [intento, ...leerHistorial(a)].slice(0, HISTORIAL_MAXIMO);
  try {
    a?.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
  } catch {
    // almacenamiento lleno o bloqueado: el intento no se recuerda
  }
  return historial;
}

// Mejor puntaje en examen para un paciente (null si nunca lo rindió).
export function mejorPuntaje(historial: readonly Intento[], caso: IdCaso, modo: Modo = 'examen'): number | null {
  const puntajes = historial.filter((i) => i.caso === caso && i.modo === modo).map((i) => i.puntaje);
  return puntajes.length ? Math.max(...puntajes) : null;
}
