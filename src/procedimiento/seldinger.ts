// Técnica de Seldinger: guía por la aguja, retirar la aguja, confirmar la guía
// con ecografía, dilatar el trayecto y pasar el catéter sobre la guía.
// Lógica pura: no dibuja ni toca el DOM.

import * as P from '../config/procedimiento';
import { limitar } from '../core/matematica';
import type { EstadoAguja, Vaso } from '../aguja/aguja';
import { punta } from '../aguja/aguja';

export type TipoEventoSeldinger =
  | 'resistencia' | 'ectopia' | 'dilatacion_arterial' | 'dilatador_profundo' | 'cateter_arterial' | 'cateter_profundo';

export interface EstadoSeldinger {
  vaso: Vaso | null; // dónde quedó la punta de la aguja al pasar la guía (null = fuera de un vaso)
  zEntradaVaso: number; // altura (z) donde la guía entra al vaso
  trayectoMm: number; // de la piel al vaso, siguiendo el trayecto de la aguja
  guia: { insertadaMm: number; resistencia: boolean; confirmada: boolean; retirada: boolean };
  agujaRetirada: boolean;
  dilatador: { mm: number; tractoDilatado: boolean };
  cateter: { mm: number }; // profundidad desde la piel
  eventos: TipoEventoSeldinger[];
}

export function iniciarSeldinger(aguja: EstadoAguja): EstadoSeldinger {
  const p = punta(aguja);
  const enVaso = aguja.lugar === 'vena' || aguja.lugar === 'arteria';
  return {
    vaso: enVaso ? (aguja.lugar as Vaso) : null,
    zEntradaVaso: p?.z ?? 0,
    trayectoMm: aguja.insertadaMm,
    guia: { insertadaMm: 0, resistencia: false, confirmada: false, retirada: false },
    agujaRetirada: false,
    dilatador: { mm: 0, tractoDilatado: false },
    cateter: { mm: 0 },
    eventos: [],
  };
}

function registrar(s: EstadoSeldinger, tipo: TipoEventoSeldinger): void {
  if (!s.eventos.includes(tipo)) s.eventos.push(tipo);
}

// ---------------------------------------------------------------------
// Guía
// ---------------------------------------------------------------------

// Avanza (+) o retira (−) la guía. Fuera de un vaso, choca enseguida: resistencia.
export function moverGuia(s: EstadoSeldinger, dMm: number): void {
  if (s.guia.retirada) return;
  const maximo = s.vaso ? P.GUIA_MAX_INSERTADA_MM : P.GUIA_MAX_SIN_VASO_MM;
  const deseado = s.guia.insertadaMm + dMm;
  s.guia.resistencia = s.vaso === null && deseado > maximo;
  if (s.guia.resistencia) registrar(s, 'resistencia');
  // Con la aguja ya retirada no se saca la guía del todo: se perdería el acceso
  const minimo = s.agujaRetirada ? P.GUIA_MIN_PARA_RETIRAR_AGUJA_MM / 2 : 0;
  s.guia.insertadaMm = limitar(deseado, minimo, maximo);
  if (nivelEctopia(s) > 0) registrar(s, 'ectopia');
}

// 0 = ritmo sinusal, 1 = extrasístoles aisladas, 2 = bigeminismo.
// La guía o el catéter en la vena, demasiado adentro, irritan el corazón.
export function nivelEctopia(s: EstadoSeldinger): 0 | 1 | 2 {
  if (s.vaso !== 'vena') return 0; // por la carótida la guía va hacia la aorta, no al ventrículo
  const nivel = (profundidad: number, umbral: number): 0 | 1 | 2 => {
    if (profundidad > umbral + (P.GUIA_ECTOPIA_GRAVE_MM - P.GUIA_ECTOPIA_MM)) return 2;
    return profundidad > umbral ? 1 : 0;
  };
  // La guía se mide desde la punta de la aguja; el catéter, desde la piel
  const porGuia = s.guia.retirada ? 0 : nivel(s.guia.insertadaMm, P.GUIA_ECTOPIA_MM);
  const porCateter = nivel(s.cateter.mm, P.CATETER_ECTOPIA_MM);
  return Math.max(porGuia, porCateter) as 0 | 1 | 2;
}

export function motivoParaRetirarAguja(s: EstadoSeldinger): string | null {
  if (s.agujaRetirada) return 'La aguja ya está afuera';
  if (s.guia.insertadaMm < P.GUIA_MIN_PARA_RETIRAR_AGUJA_MM) {
    return `Avanza al menos ${P.GUIA_MIN_PARA_RETIRAR_AGUJA_MM / 10} cm de guía antes de retirar la aguja`;
  }
  return null;
}

export function retirarAguja(s: EstadoSeldinger): boolean {
  if (motivoParaRetirarAguja(s)) return false;
  s.agujaRetirada = true;
  return true;
}

// El usuario confirma que ve la guía. Solo vale si la guía está en la imagen.
export function confirmarGuia(s: EstadoSeldinger, guiaVisible: boolean): string | null {
  if (!guiaVisible) return 'La guía no se ve en la imagen: búscala con la sonda (mejor en eje largo)';
  s.guia.confirmada = true;
  return null;
}

// ---------------------------------------------------------------------
// Dilatador
// ---------------------------------------------------------------------

export function moverDilatador(s: EstadoSeldinger, dMm: number): void {
  s.dilatador.mm = limitar(s.dilatador.mm + dMm, 0, P.DILATADOR_MAX_MM);
  if (s.dilatador.mm >= s.trayectoMm) {
    s.dilatador.tractoDilatado = true;
    if (s.vaso === 'arteria') registrar(s, 'dilatacion_arterial');
  }
  if (s.dilatador.mm > s.trayectoMm + P.DILATADOR_EXCESO_MM) registrar(s, 'dilatador_profundo');
}

// ---------------------------------------------------------------------
// Catéter
// ---------------------------------------------------------------------

export function moverCateter(s: EstadoSeldinger, dMm: number): void {
  s.cateter.mm = limitar(s.cateter.mm + dMm, 0, P.CATETER_MAX_MM);
  if (s.cateter.mm > s.trayectoMm && s.vaso === 'arteria') registrar(s, 'cateter_arterial');
  if (s.cateter.mm > P.CATETER_OBJETIVO_MAX_MM) registrar(s, 'cateter_profundo');
  if (nivelEctopia(s) > 0) registrar(s, 'ectopia');
}

export function motivoParaRetirarGuia(s: EstadoSeldinger): string | null {
  if (s.guia.retirada) return 'La guía ya está afuera';
  if (s.cateter.mm < P.CATETER_MIN_PARA_RETIRAR_GUIA_MM) {
    return `Avanza el catéter al menos ${P.CATETER_MIN_PARA_RETIRAR_GUIA_MM / 10} cm antes de retirar la guía`;
  }
  return null;
}

export function retirarGuia(s: EstadoSeldinger): boolean {
  if (motivoParaRetirarGuia(s)) return false;
  s.guia.retirada = true;
  return true;
}

export const cateterEnObjetivo = (s: EstadoSeldinger): boolean =>
  s.cateter.mm >= P.CATETER_OBJETIVO_MIN_MM && s.cateter.mm <= P.CATETER_OBJETIVO_MAX_MM;

// ---------------------------------------------------------------------
// Requisitos para pasar de fase
// ---------------------------------------------------------------------

export function motivoParaGuia(aguja: EstadoAguja): string | null {
  if (aguja.flash.cantidad === 0) return 'Aspira: sin sangre en la jeringa no se pasa la guía';
  if (aguja.lugar !== 'vena' && aguja.lugar !== 'arteria') return 'Perdiste el flash: la punta ya no está en un vaso';
  return null;
}

export function motivoParaDilatar(s: EstadoSeldinger): string | null {
  if (s.vaso === null) return 'La guía no entró a un vaso';
  if (!s.agujaRetirada) return 'Primero retira la aguja dejando la guía';
  if (!s.guia.confirmada) return 'Confirma la guía dentro del vaso con la ecografía';
  if (nivelEctopia(s) > 0) return 'Hay extrasístoles: retira la guía hasta que cedan';
  return null;
}

export function motivoParaVolverAPuncion(s: EstadoSeldinger): string | null {
  return s.agujaRetirada ? 'La aguja ya se retiró' : null;
}

export function motivoParaCateter(s: EstadoSeldinger): string | null {
  if (!s.dilatador.tractoDilatado) return 'Dilata el trayecto hasta el vaso';
  if (s.dilatador.mm > 0) return 'Retira el dilatador dejando la guía';
  return null;
}

export function motivoParaTerminar(s: EstadoSeldinger): string | null {
  if (s.cateter.mm <= s.trayectoMm) return 'El catéter todavía no llega al vaso';
  if (!s.guia.retirada) return 'Retira la guía';
  return null;
}

// ---------------------------------------------------------------------
// Dónde están los dispositivos (para dibujarlos)
// ---------------------------------------------------------------------

// Tramo del vaso (en z) que ocupa la guía o el catéter: desde la entrada al vaso
// hacia la clavícula. null si no hay nada dentro del vaso.
export function tramoEnVaso(s: EstadoSeldinger): { desdeZ: number; hastaZ: number; radio: number; brillo: number } | null {
  if (!s.vaso) return null;
  const cateterAdentro = s.cateter.mm - s.trayectoMm;
  if (cateterAdentro > 0) {
    return { desdeZ: s.zEntradaVaso - cateterAdentro, hastaZ: s.zEntradaVaso, radio: P.RADIO_CATETER_MM, brillo: P.BRILLO_CATETER };
  }
  if (!s.guia.retirada && s.guia.insertadaMm > 0) {
    return { desdeZ: s.zEntradaVaso - s.guia.insertadaMm, hastaZ: s.zEntradaVaso, radio: P.RADIO_GUIA_MM, brillo: P.BRILLO_GUIA };
  }
  return null;
}

// Qué ocupa el trayecto de la piel al vaso (el camino de la aguja) y hasta dónde.
export function instrumentoEnTrayecto(
  s: EstadoSeldinger,
): { largoMm: number; radio: number; brillo: number; tipo: 'guia' | 'dilatador' | 'cateter' } | null {
  if (s.cateter.mm > 0) return { largoMm: Math.min(s.cateter.mm, s.trayectoMm), radio: P.RADIO_CATETER_MM, brillo: P.BRILLO_CATETER, tipo: 'cateter' };
  if (s.dilatador.mm > 0) return { largoMm: s.dilatador.mm, radio: P.RADIO_DILATADOR_MM, brillo: P.BRILLO_DILATADOR, tipo: 'dilatador' };
  if (s.agujaRetirada && !s.guia.retirada) return { largoMm: s.trayectoMm, radio: P.RADIO_GUIA_MM, brillo: P.BRILLO_GUIA, tipo: 'guia' };
  return null;
}
