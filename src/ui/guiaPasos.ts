// Qué se hace en cada paso: nombre, objetivo, tareas, por qué y la pista del
// mentor según lo que está pasando. Puro (sin DOM) para poder testearlo.

import type { Fase } from '../config/fases';
import type { EstadoAguja } from '../aguja/aguja';
import type { Registro } from '../evaluacion/registro';
import { nivelEctopia, cateterEnObjetivo, type EstadoSeldinger } from '../procedimiento/seldinger';
import { GUIA_MIN_PARA_RETIRAR_AGUJA_MM } from '../config/procedimiento';
import { MM_POR_CM } from '../config/ultrasonido';
import { t, tk } from '../i18n';

// Pasos que se muestran en la lista y en la barra de herramientas (sin la evaluación)
export type Paso = Exclude<Fase, 'evaluacion'>;
export const PASOS: readonly Paso[] = ['exploracion', 'puncion', 'guia', 'dilatacion', 'cateter'];

export interface InfoPaso {
  nombre: string; // en la lista del procedimiento y el mentor
  herramienta: string; // en la barra de herramientas
  objetivo: string;
  porque: string;
}

// Los textos se leen en el idioma actual cada vez (no hace falta reconstruir nada al cambiarlo)
function infoPaso(p: Paso): InfoPaso {
  return {
    get nombre() { return tk(`paso.${p}.nombre`); },
    get herramienta() { return tk(`paso.${p}.herramienta`); },
    get objetivo() { return tk(`paso.${p}.objetivo`); },
    get porque() { return tk(`paso.${p}.porque`); },
  };
}

export const INFO_PASOS: Readonly<Record<Paso, InfoPaso>> = {
  exploracion: infoPaso('exploracion'),
  puncion: infoPaso('puncion'),
  guia: infoPaso('guia'),
  dilatacion: infoPaso('dilatacion'),
  cateter: infoPaso('cateter'),
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
        { texto: t('tarea.comprimir'), hecha: e.registro.comprimioVena },
        { texto: t('tarea.doppler'), hecha: e.registro.usoDoppler },
      ];
    case 'puncion':
      return [
        { texto: t('tarea.entrada'), hecha: e.aguja.entrada !== null },
        { texto: t('tarea.piel'), hecha: e.aguja.intentos > 0 },
        { texto: t('tarea.flash'), hecha: e.aguja.flash.tipo === 'vena' && e.aguja.flash.cantidad > 0 },
      ];
    case 'guia':
      return [
        { texto: t('tarea.guia', { cm: GUIA_MIN_PARA_RETIRAR_AGUJA_MM / MM_POR_CM }), hecha: !!s && s.guia.insertadaMm >= GUIA_MIN_PARA_RETIRAR_AGUJA_MM },
        { texto: t('tarea.retirarAguja'), hecha: !!s?.agujaRetirada },
        { texto: t('tarea.confirmar'), hecha: !!s?.guia.confirmada },
      ];
    case 'dilatacion':
      return [
        { texto: t('tarea.dilatar'), hecha: !!s?.dilatador.tractoDilatado },
        { texto: t('tarea.retirarDilatador'), hecha: !!s?.dilatador.tractoDilatado && s.dilatador.mm === 0 },
      ];
    case 'cateter':
      return [
        { texto: t('tarea.cateter'), hecha: !!s && cateterEnObjetivo(s) },
        { texto: t('tarea.retirarGuia'), hecha: !!s?.guia.retirada },
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
    return { tipo: 'warn', texto: t('pista.trombo') };
  }
  if (paso === 'puncion') {
    if (aguja.lugar === 'trombo') return { tipo: 'danger', texto: t('pista.enTrombo') };
    if (aguja.lugar === 'pulmon') return { tipo: 'danger', texto: t('pista.pleura') };
    if (aguja.lugar === 'arteria') return { tipo: 'danger', texto: t('pista.arteria') };
    if (aguja.lugar === 'vena') return { tipo: 'ok', texto: t('pista.vena') };
    if (aguja.lugar === 'pared') return { tipo: 'info', texto: t('pista.pared') };
    if (aguja.flash.cantidad > 0) return { tipo: 'warn', texto: t('pista.perdioFlash') };
  }
  if (s) {
    if (paso === 'guia' && s.guia.resistencia) {
      return { tipo: 'warn', texto: t('pista.resistencia') };
    }
    if (nivelEctopia(s) > 0) return { tipo: 'warn', texto: t('pista.ectopia') };
  }
  if (motivoSiguiente) return { tipo: 'info', texto: motivoSiguiente };
  // Sin bloqueos: lo que falta de este paso, o pasar al siguiente
  const pendiente = tareas(paso, e).find((t) => !t.hecha);
  if (pendiente) return { tipo: 'info', texto: t('pista.ahora', { tarea: `${pendiente.texto.charAt(0).toLowerCase()}${pendiente.texto.slice(1)}` }) };
  if (paso === 'cateter') return { tipo: 'ok', texto: t('pista.listoFin') };
  const siguiente = PASOS.indexOf(paso) + 1;
  return { tipo: 'ok', texto: t('pista.siguiente', { herramienta: INFO_PASOS[PASOS[siguiente]].herramienta.toLowerCase(), n: siguiente + 1 }) };
}
