// Máquina de estados de la partida.
// Guarda la fase actual, valida los cambios de fase y avisa a quien escuche.

import { FASE_INICIAL, TRANSICIONES, type Fase } from '../config/fases';
import { t } from '../i18n';

export interface Estado {
  fase: Fase;
  tiempoEnFase: number; // s desde que se entró a la fase actual
  tiempoTotal: number; // s desde el inicio de la partida
}

type Oyente = (nueva: Fase, anterior: Fase) => void;
// Devuelve null si se puede pasar a esa fase, o el motivo por el que no.
type Condicion = () => string | null;

const estado: Estado = { fase: FASE_INICIAL, tiempoEnFase: 0, tiempoTotal: 0 };
const oyentes = new Set<Oyente>();
const condiciones = new Map<string, Condicion>();
const clave = (desde: Fase, hacia: Fase): string => `${desde}→${hacia}`;

// Requisito clínico para una transición (por ejemplo, no dilatar sin confirmar la guía).
export function fijarCondicion(desde: Fase, hacia: Fase, condicion: Condicion): void {
  condiciones.set(clave(desde, hacia), condicion);
}

// Motivo por el que no se puede ir a esa fase ahora, o null si se puede.
export function motivoBloqueo(fase: Fase): string | null {
  if (!fasesSiguientes().includes(fase)) return t('motivo.transicion');
  return condiciones.get(clave(estado.fase, fase))?.() ?? null;
}

export function obtenerEstado(): Readonly<Estado> {
  return { ...estado };
}

// Fases a las que se puede ir desde la actual.
export function fasesSiguientes(): readonly Fase[] {
  return TRANSICIONES[estado.fase];
}

export function puedeIrA(fase: Fase): boolean {
  return motivoBloqueo(fase) === null;
}

// Cambia de fase solo si la transición está permitida. Devuelve true si cambió.
export function irA(fase: Fase): boolean {
  if (!puedeIrA(fase)) return false;
  const anterior = estado.fase;
  estado.fase = fase;
  estado.tiempoEnFase = 0;
  notificar(anterior);
  return true;
}

// Termina la partida desde cualquier fase (por ejemplo, se acabó el tiempo del examen).
export function terminar(): void {
  if (estado.fase === 'evaluacion') return;
  const anterior = estado.fase;
  estado.fase = 'evaluacion';
  estado.tiempoEnFase = 0;
  notificar(anterior);
}

// Vuelve al inicio de la partida.
export function reiniciar(): void {
  const anterior = estado.fase;
  estado.fase = FASE_INICIAL;
  estado.tiempoEnFase = 0;
  estado.tiempoTotal = 0;
  notificar(anterior);
}

// Avanza los relojes; se llama una vez por cuadro desde el loop.
export function actualizar(dt: number): void {
  estado.tiempoEnFase += dt;
  estado.tiempoTotal += dt;
}

// Registra una función que se llama con (faseNueva, faseAnterior).
// Devuelve una función para darse de baja.
export function alCambiarFase(fn: Oyente): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function notificar(anterior: Fase): void {
  for (const fn of oyentes) fn(estado.fase, anterior);
}
