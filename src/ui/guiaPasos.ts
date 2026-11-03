// Qué se hace en cada paso: nombre, objetivo, tareas, por qué y la pista del
// mentor según lo que está pasando. Puro (sin DOM) para poder testearlo.

import type { Fase } from '../config/fases';
import type { EstadoAguja } from '../aguja/aguja';
import type { Registro } from '../evaluacion/registro';
import { nivelEctopia, cateterEnObjetivo, type EstadoSeldinger } from '../procedimiento/seldinger';
import { GUIA_MIN_PARA_RETIRAR_AGUJA_MM } from '../config/procedimiento';

// Pasos que se muestran en la lista y en la barra de herramientas (sin la evaluación)
export type Paso = Exclude<Fase, 'evaluacion'>;
export const PASOS: readonly Paso[] = ['exploracion', 'puncion', 'guia', 'dilatacion', 'cateter'];

export interface InfoPaso {
  nombre: string; // en la lista del procedimiento y el mentor
  herramienta: string; // en la barra de herramientas
  objetivo: string;
  porque: string;
}

export const INFO_PASOS: Readonly<Record<Paso, InfoPaso>> = {
  exploracion: {
    nombre: 'Explorar con la sonda',
    herramienta: 'Sonda',
    objetivo: 'Busca la yugular y la carótida en el triángulo entre los dos haces del ECM. Comprime: la vena colapsa, la arteria no.',
    porque: 'Puncionar sin saber qué vaso es cuál es la causa principal de punción carotídea. La compresión es la prueba más rápida: '
      + 'la vena trabaja a unos 6 mmHg y la carótida a 75–120 mmHg.',
  },
  puncion: {
    nombre: 'Puncionar la vena',
    herramienta: 'Aguja',
    objetivo: 'Toca la piel por encima de la sonda para elegir la entrada y avanza siguiendo la punta hasta ver la tienda y el flash.',
    porque: 'Con la sonda transversal la aguja se ve como un punto, y ese punto puede ser el cuerpo y no la punta. '
      + 'Mueve la sonda para seguir la punta y avanza de a poco.',
  },
  guia: {
    nombre: 'Pasar la guía',
    herramienta: 'Guía',
    objetivo: 'Avanza la guía por la aguja sin forzar, retira la aguja y confirma la guía dentro de la vena.',
    porque: 'La guía en la vena es la última barrera antes de dilatar: si estuviera en la carótida, el dilatador '
      + 'abriría un orificio grande en la arteria.',
  },
  dilatacion: {
    nombre: 'Dilatar el trayecto',
    herramienta: 'Dilatador',
    objetivo: 'Avanza el dilatador sobre la guía hasta la pared de la vena y retíralo.',
    porque: 'El dilatador solo abre la piel y el tejido para que pase el catéter; más profundo, puede desgarrar la vena.',
  },
  cateter: {
    nombre: 'Colocar el catéter',
    herramienta: 'Catéter',
    objetivo: 'Avanza el catéter sobre la guía hasta 12–16 cm y retira la guía.',
    porque: 'En la yugular derecha, 12–16 cm deja la punta en la vena cava superior; más profundo entra en la aurícula.',
  },
};

export interface EstadoProcedimiento {
  registro: Registro;
  aguja: EstadoAguja;
  seldinger: EstadoSeldinger | null;
  tromboComprimido?: boolean; // comprimiendo ahora mismo sobre un segmento trombosado
}

export interface Tarea { texto: string; hecha: boolean }

export function tareas(paso: Paso, e: EstadoProcedimiento): Tarea[] {
  const s = e.seldinger;
  switch (paso) {
    case 'exploracion':
      return [
        { texto: 'Comprime y mira colapsar la vena', hecha: e.registro.comprimioVena },
        { texto: 'Mira el flujo con Doppler', hecha: e.registro.usoDoppler },
      ];
    case 'puncion':
      return [
        { texto: 'Elige el punto de entrada', hecha: e.aguja.entrada !== null },
        { texto: 'Atraviesa la piel', hecha: e.aguja.intentos > 0 },
        { texto: 'Flash de sangre oscura', hecha: e.aguja.flash.tipo === 'vena' && e.aguja.flash.cantidad > 0 },
      ];
    case 'guia':
      return [
        { texto: `Avanza al menos ${GUIA_MIN_PARA_RETIRAR_AGUJA_MM / 10} cm de guía`, hecha: !!s && s.guia.insertadaMm >= GUIA_MIN_PARA_RETIRAR_AGUJA_MM },
        { texto: 'Retira la aguja', hecha: !!s?.agujaRetirada },
        { texto: 'Confirma la guía en la ecografía', hecha: !!s?.guia.confirmada },
      ];
    case 'dilatacion':
      return [
        { texto: 'Dilata hasta el vaso', hecha: !!s?.dilatador.tractoDilatado },
        { texto: 'Retira el dilatador', hecha: !!s?.dilatador.tractoDilatado && s.dilatador.mm === 0 },
      ];
    case 'cateter':
      return [
        { texto: 'Catéter a 12–16 cm', hecha: !!s && cateterEnObjetivo(s) },
        { texto: 'Retira la guía', hecha: !!s?.guia.retirada },
      ];
  }
}

export type TipoPista = 'info' | 'ok' | 'warn' | 'danger';
export interface Pista { texto: string; tipo: TipoPista }

// Lo más importante que el mentor tiene que decir ahora. 'motivoSiguiente' es por
// qué todavía no se puede pasar al paso siguiente (o null si ya se puede).
export function pista(paso: Paso, e: EstadoProcedimiento, motivoSiguiente: string | null): Pista {
  const { aguja, seldinger: s } = e;
  if ((paso === 'exploracion' || paso === 'puncion') && e.tromboComprimido) {
    return { tipo: 'warn', texto: 'La vena no colapsa y se ve gris por dentro, sin flujo: es un trombo. No punciones aquí; busca un tramo libre.' };
  }
  if (paso === 'puncion') {
    if (aguja.lugar === 'trombo') return { tipo: 'danger', texto: 'No sale sangre: la punta está en un trombo. Retira la aguja y busca un tramo libre.' };
    if (aguja.lugar === 'pulmon') return { tipo: 'danger', texto: 'La aguja llegó a la pleura: retírala. Riesgo de neumotórax.' };
    if (aguja.lugar === 'arteria') return { tipo: 'danger', texto: 'Sangre roja y pulsátil: estás en la carótida. Retira la aguja y comprime.' };
    if (aguja.lugar === 'vena') return { tipo: 'ok', texto: 'Flash de sangre oscura: estás en la vena. Sin mover la aguja, pasa la guía (3).' };
    if (aguja.lugar === 'pared') return { tipo: 'info', texto: 'La punta empuja la pared (tienda). Avanza de a poco hasta que ceda.' };
    if (aguja.flash.cantidad > 0) return { tipo: 'warn', texto: 'Perdiste el flash: la punta salió del vaso. Retira lentamente hasta recuperarlo.' };
  }
  if (s) {
    if (paso === 'guia' && s.guia.resistencia) {
      return { tipo: 'warn', texto: 'Resistencia: la punta no está en la luz. No fuerces; vuelve a la aguja (2) y recupera el flash.' };
    }
    if (nivelEctopia(s) > 0) return { tipo: 'warn', texto: 'Extrasístoles en el monitor: la guía llegó al corazón. Retírala unos centímetros.' };
  }
  if (motivoSiguiente) return { tipo: 'info', texto: motivoSiguiente };
  // Sin bloqueos: lo que falta de este paso, o pasar al siguiente
  const pendiente = tareas(paso, e).find((t) => !t.hecha);
  if (pendiente) return { tipo: 'info', texto: `Ahora: ${pendiente.texto.charAt(0).toLowerCase()}${pendiente.texto.slice(1)}.` };
  if (paso === 'cateter') return { tipo: 'ok', texto: 'Listo: termina para ver tu evaluación.' };
  const siguiente = PASOS.indexOf(paso) + 1;
  return { tipo: 'ok', texto: `Listo: pasa a ${INFO_PASOS[PASOS[siguiente]].herramienta.toLowerCase()} (${siguiente + 1}).` };
}
