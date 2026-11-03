// Registro de la sesión: lo que pasa en todos los intentos, aunque se vuelva a
// empezar la punción. Puro: main.ts lo va llenando.

import type { EstadoAguja, TipoEvento } from '../aguja/aguja';

export interface Registro {
  intentosAnteriores: number; // pinchazos de agujas ya descartadas
  eventosAnteriores: TipoEvento[];
  comprimioVena: boolean; // comprobó que la vena colapsa antes de puncionar
  usoDoppler: boolean;
  confirmoEnEjeLargo: boolean;
  detectoTrombo: boolean; // comprimió sobre el trombo y vio que la vena no colapsa
}

export function registroNuevo(): Registro {
  return {
    intentosAnteriores: 0, eventosAnteriores: [], comprimioVena: false, usoDoppler: false, confirmoEnEjeLargo: false,
    detectoTrombo: false,
  };
}

// Al descartar una aguja (volver a explorar), se guarda lo que pasó con ella.
export function archivarAguja(r: Registro, a: EstadoAguja): void {
  r.intentosAnteriores += a.intentos;
  r.eventosAnteriores.push(...a.eventos.map((e) => e.tipo));
}

export const intentosTotales = (r: Registro, a: EstadoAguja): number => r.intentosAnteriores + a.intentos;

export const eventosAguja = (r: Registro, a: EstadoAguja): TipoEvento[] => [
  ...r.eventosAnteriores, ...a.eventos.map((e) => e.tipo),
];
