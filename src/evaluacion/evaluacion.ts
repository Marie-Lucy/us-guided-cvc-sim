// Evaluación final: qué salió bien, qué salió mal y por qué. Pura.

import * as V from '../config/evaluacion';
import type { TipoEvento } from '../aguja/aguja';
import { cateterEnObjetivo, type EstadoSeldinger, type TipoEventoSeldinger } from '../procedimiento/seldinger';
import type { Registro } from './registro';
import { t, tk } from '../i18n';

export type Gravedad = 'grave' | 'moderada' | 'leve';

export interface Hallazgo { tipo: TipoEvento | TipoEventoSeldinger; gravedad: Gravedad; titulo: string; explicacion: string }

export interface Resultado {
  exito: boolean; // catéter en la vena, guía retirada y sin complicaciones graves
  puntaje: number;
  nota: Nota; // se guarda en el historial; se traduce al mostrarla
  calificacion: string; // la nota en el idioma actual
  intentos: number;
  tiempoS: number;
  complicaciones: Hallazgo[];
  aciertos: string[];
  consejos: string[];
}

export interface EntradaEvaluacion {
  registro: Registro;
  intentos: number;
  eventosAguja: TipoEvento[];
  seldinger: EstadoSeldinger | null;
  tiempoS: number;
  tiempoAgotado?: boolean; // examen: se terminó el tiempo antes de completar
  pasosCompletados?: number; // pasos del procedimiento terminados (0 a 5), para el tiempo agotado
}

// Complicaciones y su gravedad; el título y la explicación (para aprender del error)
// salen del diccionario: comp.<tipo>.titulo y comp.<tipo>.explicacion
const GRAVEDAD: Partial<Record<TipoEvento | TipoEventoSeldinger, Gravedad>> = {
  puncion_carotida: 'grave',
  neumotorax: 'grave',
  dilatacion_arterial: 'grave',
  cateter_arterial: 'grave',
  puncion_trombo: 'grave',
  pared_posterior: 'moderada',
  dilatador_profundo: 'moderada',
  ectopia: 'leve',
  cateter_profundo: 'leve',
};

const DESCUENTO: Record<Gravedad, number> = {
  grave: V.DESCUENTO_GRAVE, moderada: V.DESCUENTO_MODERADA, leve: V.DESCUENTO_LEVE,
};

export function complicaciones(eventos: (TipoEvento | TipoEventoSeldinger)[]): Hallazgo[] {
  const vistas = new Set<string>();
  const hallazgos: Hallazgo[] = [];
  for (const tipo of eventos) {
    const gravedad = GRAVEDAD[tipo];
    if (!gravedad || vistas.has(tipo)) continue;
    vistas.add(tipo);
    hallazgos.push({ tipo, gravedad, titulo: tk(`comp.${tipo}.titulo`), explicacion: tk(`comp.${tipo}.explicacion`) });
  }
  const orden: Record<Gravedad, number> = { grave: 0, moderada: 1, leve: 2 };
  return hallazgos.sort((a, b) => orden[a.gravedad] - orden[b.gravedad]);
}

function descuentoTiempo(tiempoS: number): number {
  const extra = Math.max(tiempoS - V.TIEMPO_SIN_DESCUENTO_S, 0) / V.SEGUNDOS_POR_PUNTO;
  return Math.min(Math.floor(extra), V.DESCUENTO_TIEMPO_MAXIMO);
}

export type Nota = 'tiempo' | 'fallido' | 'excelente' | 'bien' | 'mejorar';

function nota(puntaje: number, exito: boolean, tiempoAgotado: boolean): Nota {
  if (tiempoAgotado) return 'tiempo';
  if (!exito) return 'fallido';
  if (puntaje >= V.UMBRAL_EXCELENTE) return 'excelente';
  if (puntaje >= V.UMBRAL_BUENO) return 'bien';
  return 'mejorar';
}

export const textoNota = (n: Nota): string => tk(`nota.${n}`);

export function evaluar(e: EntradaEvaluacion): Resultado {
  const s = e.seldinger;
  // Cada evento cuenta una vez (si se repite en varios intentos, ya lo refleja el número de intentos)
  const lista = complicaciones([...e.eventosAguja, ...(s?.eventos ?? [])]);
  const hayGrave = lista.some((c) => c.gravedad === 'grave');
  const cateterEnVena = !!s && s.vaso === 'vena' && s.cateter.mm > s.trayectoMm && s.guia.retirada;
  const exito = cateterEnVena && !hayGrave && !e.tiempoAgotado;

  let puntaje = V.PUNTAJE_MAXIMO
    - V.DESCUENTO_POR_INTENTO_EXTRA * Math.max(e.intentos - 1, 0)
    - descuentoTiempo(e.tiempoS)
    - lista.reduce((suma, c) => suma + DESCUENTO[c.gravedad], 0);
  if (!exito) puntaje = Math.min(puntaje, V.PUNTAJE_MAXIMO_SIN_EXITO);
  // Tiempo agotado: el tope depende de cuánto del procedimiento se llegó a hacer
  if (e.tiempoAgotado) {
    const avance = Math.min(e.pasosCompletados ?? 0, V.PASOS_PROCEDIMIENTO) / V.PASOS_PROCEDIMIENTO;
    puntaje = Math.min(puntaje, V.PUNTAJE_MAXIMO_SIN_EXITO * avance);
  }
  puntaje = Math.max(Math.round(puntaje), 0);

  const aciertos: string[] = [];
  if (e.registro.comprimioVena) aciertos.push(t('acierto.comprimio'));
  if (e.registro.usoDoppler) aciertos.push(t('acierto.doppler'));
  if (e.registro.confirmoEnEjeLargo) aciertos.push(t('acierto.ejeLargo'));
  if (e.registro.detectoTrombo) aciertos.push(t('acierto.trombo'));
  if (e.intentos === 1 && cateterEnVena) aciertos.push(t('acierto.unPinchazo'));
  if (s && cateterEnObjetivo(s)) aciertos.push(t('acierto.cateter'));
  if (lista.length === 0 && cateterEnVena) aciertos.push(t('acierto.sinComplicaciones'));

  const consejos: string[] = [];
  if (e.tiempoAgotado) consejos.push(t('consejo.tiempo'));
  if (e.intentos > 1) {
    consejos.push(t('consejo.intentos', { n: e.intentos }));
  }
  // En una vena trombosada no hay colapso que ver: comprimir y no ver colapso ya es la prueba
  if (!e.registro.comprimioVena && !e.registro.detectoTrombo) consejos.push(t('consejo.comprimir'));
  if (s?.eventos.includes('resistencia')) {
    consejos.push(t('consejo.resistencia'));
  }
  if (s && s.cateter.mm > s.trayectoMm && !cateterEnObjetivo(s) && s.cateter.mm < 120) {
    consejos.push(t('consejo.corto'));
  }
  if (!cateterEnVena && !hayGrave && !e.tiempoAgotado) consejos.push(t('consejo.noColocado'));

  const n = nota(puntaje, exito, !!e.tiempoAgotado);
  return {
    exito, puntaje, nota: n, calificacion: textoNota(n),
    intentos: e.intentos, tiempoS: e.tiempoS, complicaciones: lista, aciertos, consejos,
  };
}
