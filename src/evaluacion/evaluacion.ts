// Evaluación final: qué salió bien, qué salió mal y por qué. Pura.

import * as V from '../config/evaluacion';
import type { TipoEvento } from '../aguja/aguja';
import { cateterEnObjetivo, type EstadoSeldinger, type TipoEventoSeldinger } from '../procedimiento/seldinger';
import type { Registro } from './registro';

export type Gravedad = 'grave' | 'moderada' | 'leve';

export interface Hallazgo { tipo: TipoEvento | TipoEventoSeldinger; gravedad: Gravedad; titulo: string; explicacion: string }

export interface Resultado {
  exito: boolean; // catéter en la vena, guía retirada y sin complicaciones graves
  puntaje: number;
  calificacion: string;
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

// Complicaciones: gravedad y explicación para aprender del error
const COMPLICACIONES: Partial<Record<TipoEvento | TipoEventoSeldinger, Omit<Hallazgo, 'tipo'>>> = {
  puncion_carotida: {
    gravedad: 'grave',
    titulo: 'Punción carotídea',
    explicacion: 'La aguja entró en la carótida (sangre roja y pulsátil). Antes de puncionar, identifica la arteria: '
      + 'es redonda, pulsa y no colapsa al comprimir. Mantén la punta a la vista y apunta a la vena, lateral.',
  },
  neumotorax: {
    gravedad: 'grave',
    titulo: 'Neumotórax',
    explicacion: 'La aguja llegó a la pleura. Junto a la clavícula la cúpula pleural está a 2–3 cm: punciona más arriba, '
      + 'con menos ángulo, y nunca más hondo que la pared posterior del vaso.',
  },
  dilatacion_arterial: {
    gravedad: 'grave',
    titulo: 'Dilatación de la carótida',
    explicacion: 'Se dilató un trayecto hacia la arteria: es la complicación más peligrosa del procedimiento. '
      + 'Confirma siempre la guía dentro de la vena (en eje largo y siguiéndola hacia la clavícula) antes de dilatar.',
  },
  cateter_arterial: {
    gravedad: 'grave',
    titulo: 'Catéter en la carótida',
    explicacion: 'El catéter quedó en la arteria. El error empezó antes: la guía no se confirmó dentro de la vena.',
  },
  puncion_trombo: {
    gravedad: 'grave',
    titulo: 'Punción de una vena trombosada',
    explicacion: 'La aguja entró en el trombo: no sale sangre y se puede desprender un émbolo. '
      + 'Una vena que no colapsa al comprimir, con contenido gris y sin flujo en el Doppler, está trombosada: busca un tramo libre o cambia de sitio.',
  },
  pared_posterior: {
    gravedad: 'moderada',
    titulo: 'Punción de la pared posterior',
    explicacion: 'La aguja atravesó la vena. Suele pasar al perder la punta de vista (el punto brillante era el cuerpo, '
      + 'no la punta) o al aplastar la vena con la tienda. Avanza de a poco moviendo la sonda para seguir la punta, '
      + 'y si no hay flash, retira lentamente aspirando.',
  },
  dilatador_profundo: {
    gravedad: 'moderada',
    titulo: 'Dilatador demasiado profundo',
    explicacion: 'Solo hace falta dilatar la piel y el tejido hasta la pared de la vena; más allá se puede desgarrar el vaso.',
  },
  ectopia: {
    gravedad: 'leve',
    titulo: 'Extrasístoles por la guía',
    explicacion: 'La guía (o el catéter) llegó al corazón. Para la yugular derecha alcanzan 15–20 cm de guía; '
      + 'vigila el monitor mientras avanzas.',
  },
  cateter_profundo: {
    gravedad: 'leve',
    titulo: 'Catéter demasiado profundo',
    explicacion: 'Más de 16 cm desde la piel: la punta puede quedar en la aurícula. Para la yugular derecha, 12–16 cm.',
  },
};

const DESCUENTO: Record<Gravedad, number> = {
  grave: V.DESCUENTO_GRAVE, moderada: V.DESCUENTO_MODERADA, leve: V.DESCUENTO_LEVE,
};

export function complicaciones(eventos: (TipoEvento | TipoEventoSeldinger)[]): Hallazgo[] {
  const vistas = new Set<string>();
  const hallazgos: Hallazgo[] = [];
  for (const tipo of eventos) {
    const c = COMPLICACIONES[tipo];
    if (!c || vistas.has(tipo)) continue;
    vistas.add(tipo);
    hallazgos.push({ tipo, ...c });
  }
  const orden: Record<Gravedad, number> = { grave: 0, moderada: 1, leve: 2 };
  return hallazgos.sort((a, b) => orden[a.gravedad] - orden[b.gravedad]);
}

function descuentoTiempo(tiempoS: number): number {
  const extra = Math.max(tiempoS - V.TIEMPO_SIN_DESCUENTO_S, 0) / V.SEGUNDOS_POR_PUNTO;
  return Math.min(Math.floor(extra), V.DESCUENTO_TIEMPO_MAXIMO);
}

function calificacion(puntaje: number, exito: boolean, tiempoAgotado: boolean): string {
  if (tiempoAgotado) return 'Tiempo agotado';
  if (!exito) return 'Procedimiento no logrado';
  if (puntaje >= V.UMBRAL_EXCELENTE) return 'Excelente';
  if (puntaje >= V.UMBRAL_BUENO) return 'Bien';
  return 'Logrado, con aspectos a mejorar';
}

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
  if (e.registro.comprimioVena) aciertos.push('Comprobaste con compresión que la vena colapsa y la arteria no.');
  if (e.registro.usoDoppler) aciertos.push('Usaste el Doppler color para distinguir los vasos.');
  if (e.registro.confirmoEnEjeLargo) aciertos.push('Confirmaste la guía en eje largo antes de dilatar.');
  if (e.registro.detectoTrombo) aciertos.push('Reconociste el trombo: comprimiste y la vena no colapsaba.');
  if (e.intentos === 1 && cateterEnVena) aciertos.push('Lo lograste en un solo pinchazo.');
  if (s && cateterEnObjetivo(s)) aciertos.push('El catéter quedó a la profundidad correcta (12–16 cm).');
  if (lista.length === 0 && cateterEnVena) aciertos.push('Sin complicaciones.');

  const consejos: string[] = [];
  if (e.tiempoAgotado) consejos.push('Se terminó el tiempo del examen. Practica cada paso hasta hacerlo sin dudar antes de volver a rendir.');
  if (e.intentos > 1) {
    consejos.push(`Necesitaste ${e.intentos} pinchazos. Cada uno suma riesgo: tómate tiempo para alinear sonda y aguja antes de entrar.`);
  }
  // En una vena trombosada no hay colapso que ver: comprimir y no ver colapso ya es la prueba
  if (!e.registro.comprimioVena && !e.registro.detectoTrombo) consejos.push('Antes de puncionar, comprime: es la forma más rápida de distinguir vena (colapsa) de arteria.');
  if (s?.eventos.includes('resistencia')) {
    consejos.push('La guía encontró resistencia: la punta no estaba en la luz. Nunca empujes contra resistencia; recupera el flash primero.');
  }
  if (s && s.cateter.mm > s.trayectoMm && !cateterEnObjetivo(s) && s.cateter.mm < 120) {
    consejos.push('El catéter quedó corto (menos de 12 cm): la punta puede no llegar a la vena cava.');
  }
  if (!cateterEnVena && !hayGrave && !e.tiempoAgotado) consejos.push('El catéter no quedó colocado en la vena.');

  return {
    exito, puntaje, calificacion: calificacion(puntaje, exito, !!e.tiempoAgotado),
    intentos: e.intentos, tiempoS: e.tiempoS, complicaciones: lista, aciertos, consejos,
  };
}
