// Estado de la aguja y lo que le pasa a su punta al avanzar o retirarse.
// La lógica es pura respecto del dibujo: recibe una función que da el corte
// anatómico a cualquier altura del cuello.

import {
  ANGULO_MIN_GRADOS, ANGULO_MAX_GRADOS, ANGULO_INICIAL_GRADOS,
  ORIENTACION_MIN_GRADOS, ORIENTACION_MAX_GRADOS, ORIENTACION_INICIAL_GRADOS,
  LARGO_AGUJA_MM, PASO_SIMULACION_MM, TIENDA_MAXIMA_ARTERIA_MM, TIENDA_SOBRE_TROMBO_MM, TROMBO_QUE_SOSTIENE_PARED,
  LLENADO_FLASH_POR_S,
} from '../config/aguja';
import { profundidadPleura, enTrombo, type Corte, type Elipse } from '../anatomia/anatomia';
import { limitar } from '../core/matematica';
import { direccionAguja, puntoAguja, type P3 } from './geometria';

export type Vaso = 'vena' | 'arteria';
// Dónde está la punta
// 'trombo': la punta está dentro de una vena, pero en el coágulo (no sale sangre)
export type Lugar = 'piel' | 'tejido' | 'pared' | Vaso | 'trombo' | 'pulmon';
export type TipoEvento =
  | 'flash_venoso' | 'flash_arterial' | 'pared_posterior' | 'puncion_carotida' | 'neumotorax' | 'puncion_trombo';

export interface Evento { tipo: TipoEvento; intento: number }

export interface Tienda { vaso: Vaso; profundidadMm: number; x: number; z: number }

export interface EstadoAguja {
  entrada: P3 | null; // punto de la piel elegido (y = 0)
  anguloGrados: number;
  orientacionGrados: number;
  insertadaMm: number;
  lugar: Lugar;
  perforada: Record<Vaso, boolean>; // pared anterior ya atravesada en este intento
  tienda: Tienda | null; // pared hundida por la punta, sin perforar
  flash: { cantidad: number; tipo: Vaso | null }; // sangre en la jeringa (0 a 1)
  intentos: number; // veces que la aguja atravesó la piel
  eventos: Evento[];
}

// Corte anatómico a cualquier altura z (lateral 0: sus x son las del marco de la aguja).
export type CortePorAltura = (z: number) => Corte;

export function estadoInicial(): EstadoAguja {
  return {
    entrada: null,
    anguloGrados: ANGULO_INICIAL_GRADOS,
    orientacionGrados: ORIENTACION_INICIAL_GRADOS,
    insertadaMm: 0,
    lugar: 'piel',
    perforada: { vena: false, arteria: false },
    tienda: null,
    flash: { cantidad: 0, tipo: null },
    intentos: 0,
    eventos: [],
  };
}

export const direccion = (a: EstadoAguja): P3 => direccionAguja(a.anguloGrados, a.orientacionGrados);

export function punta(a: EstadoAguja): P3 | null {
  return a.entrada ? puntoAguja(a.entrada, direccion(a), a.insertadaMm) : null;
}

// ---------------------------------------------------------------------
// Ajustes antes de puncionar (solo con la aguja fuera de la piel)
// ---------------------------------------------------------------------

export function elegirEntrada(a: EstadoAguja, x: number, z: number): void {
  if (a.insertadaMm > 0) return;
  a.entrada = { x, y: 0, z };
}

export function cambiarAngulo(a: EstadoAguja, grados: number): void {
  if (a.insertadaMm > 0) return;
  a.anguloGrados = limitar(grados, ANGULO_MIN_GRADOS, ANGULO_MAX_GRADOS);
}

export function cambiarOrientacion(a: EstadoAguja, grados: number): void {
  if (a.insertadaMm > 0) return;
  a.orientacionGrados = limitar(grados, ORIENTACION_MIN_GRADOS, ORIENTACION_MAX_GRADOS);
}

// ---------------------------------------------------------------------
// Geometría de los vasos en el punto de la punta
// ---------------------------------------------------------------------

const elipseArteria = (c: Corte): Elipse => ({ cx: c.arteria.cx, cy: c.arteria.cy, rx: c.arteria.r, ry: c.arteria.r });
const elipseDe = (c: Corte, v: Vaso): Elipse => (v === 'vena' ? c.vena : elipseArteria(c));

const dentro = (e: Elipse, x: number, y: number): boolean => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 < 1;

// Profundidad de la pared anterior (el techo del vaso) en la vertical x.
function techo(e: Elipse, x: number): number {
  const u = (x - e.cx) / e.rx;
  return e.cy - e.ry * Math.sqrt(Math.max(1 - u * u, 0));
}

// La pared venosa depende del paciente (viene en el corte); la arterial, no.
// Sobre un trombo la pared casi no se hunde: el coágulo la sostiene.
function tiendaMaxima(vaso: Vaso, corte: Corte): number {
  if (vaso === 'arteria') return TIENDA_MAXIMA_ARTERIA_MM;
  return corte.tromboVena >= TROMBO_QUE_SOSTIENE_PARED ? TIENDA_SOBRE_TROMBO_MM : corte.tiendaMaximaVenaMm;
}

// La punta quedó dentro del vaso: en la luz (flash) o, en la vena, dentro del trombo.
function dentroDelVaso(a: EstadoAguja, vaso: Vaso, p: P3, corte: Corte): void {
  if (vaso === 'vena' && enTrombo(corte.vena, corte.tromboVena, p.x, p.y)) {
    a.lugar = 'trombo';
    registrar(a, 'puncion_trombo');
    return;
  }
  a.lugar = vaso;
  registrar(a, vaso === 'vena' ? 'flash_venoso' : 'flash_arterial');
  if (vaso === 'arteria') registrar(a, 'puncion_carotida');
}

function registrar(a: EstadoAguja, tipo: TipoEvento): void {
  // Una vez por intento: lo que importa es si pasó, no cuántos cuadros duró
  if (!a.eventos.some((e) => e.tipo === tipo && e.intento === a.intentos)) a.eventos.push({ tipo, intento: a.intentos });
}

// Decide dónde queda la punta tras un paso, actualizando tienda, perforaciones y eventos.
function evaluarPunta(a: EstadoAguja, p: P3, corte: Corte, avanzando: boolean): void {
  const anterior = a.lugar;
  const vasoEmpujado = a.tienda?.vaso ?? null;
  a.tienda = null;

  if (p.y > profundidadPleura(corte.pleura, p.x)) {
    a.lugar = 'pulmon';
    registrar(a, 'neumotorax');
    return;
  }

  for (const vaso of ['vena', 'arteria'] as const) {
    const e = elipseDe(corte, vaso);
    if (dentro(e, p.x, p.y)) {
      if (a.perforada[vaso]) {
        dentroDelVaso(a, vaso, p, corte);
        return;
      }
      // Pared sin perforar: la punta la empuja (tienda) hasta que cede
      const hundimiento = p.y - techo(e, p.x);
      if (avanzando && hundimiento >= tiendaMaxima(vaso, corte)) {
        a.perforada[vaso] = true;
        dentroDelVaso(a, vaso, p, corte);
        return;
      }
      a.lugar = 'pared';
      a.tienda = { vaso, profundidadMm: Math.max(hundimiento, 0), x: p.x, z: p.z };
      return;
    }
    // Salió de un vaso por debajo de su centro avanzando: atravesó la pared posterior.
    // Pasa también si la pared anterior nunca cedió y la vena era tan fina que la punta
    // la cruzó entera hundiéndola (vena colapsada o tienda muy profunda).
    const veniaDeEseVaso = anterior === vaso || vasoEmpujado === vaso || (vaso === 'vena' && anterior === 'trombo');
    if (avanzando && veniaDeEseVaso && p.y > e.cy) {
      a.perforada[vaso] = true;
      if (vaso === 'vena') registrar(a, 'pared_posterior');
      else registrar(a, 'puncion_carotida');
    }
  }
  a.lugar = p.y <= 0 ? 'piel' : 'tejido';
}

// ---------------------------------------------------------------------
// Avanzar / retirar
// ---------------------------------------------------------------------

// Mueve la aguja dMm (positivo = avanzar) en pasos pequeños para no saltarse paredes finas.
export function moverAguja(a: EstadoAguja, dMm: number, cortePorAltura: CortePorAltura): void {
  if (!a.entrada || dMm === 0) return;
  const avanzando = dMm > 0;
  const objetivo = limitar(a.insertadaMm + dMm, 0, LARGO_AGUJA_MM);
  if (a.insertadaMm === 0 && objetivo > 0) {
    // Nuevo pinchazo en la piel: nuevo intento, jeringa vacía
    a.intentos += 1;
    a.perforada = { vena: false, arteria: false };
    a.flash = { cantidad: 0, tipo: null };
  }
  const d = direccion(a);
  while (a.insertadaMm !== objetivo) {
    const paso = Math.min(PASO_SIMULACION_MM, Math.abs(objetivo - a.insertadaMm));
    a.insertadaMm += avanzando ? paso : -paso;
    const p = puntoAguja(a.entrada, d, a.insertadaMm);
    evaluarPunta(a, p, cortePorAltura(p.z), avanzando);
  }
  if (a.insertadaMm === 0) {
    a.lugar = 'piel';
    a.tienda = null;
  }
}

// Reevalúa la punta sin moverla (los vasos laten, respiran y se comprimen).
export function reevaluar(a: EstadoAguja, cortePorAltura: CortePorAltura): void {
  const p = punta(a);
  if (!p || a.insertadaMm === 0) return;
  evaluarPunta(a, p, cortePorAltura(p.z), false);
}

// La jeringa se llena mientras la punta está dentro de un vaso (aspirando).
export function actualizarFlash(a: EstadoAguja, dt: number): void {
  if (a.lugar === 'vena' || a.lugar === 'arteria') {
    a.flash.tipo = a.lugar;
    a.flash.cantidad = Math.min(1, a.flash.cantidad + LLENADO_FLASH_POR_S * dt);
  }
}
