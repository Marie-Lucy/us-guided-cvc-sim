// Esquema del corte en colores planos: vista didáctica para comparar con la ecografía.
// También se usa si el navegador no tiene WebGL.

import { ANCHO_SONDA_MM } from '../config/anatomia';
import {
  COLORES_PLANO, COLOR_FUERA_IMAGEN, GROSOR_PLEURA_PX, PASO_DIBUJO_PLEURA_MM,
} from '../config/ultrasonido';
import { profundidadPleura, type Corte, type Elipse, type Pleura } from '../anatomia/anatomia';
import type { Vista } from './vista';

function elipse(ctx: CanvasRenderingContext2D, v: Vista, e: Elipse, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(v.aPxX(e.cx), v.aPxY(e.cy), e.rx * v.escala, e.ry * v.escala, 0, 0, 2 * Math.PI);
  ctx.fill();
}

function trazarPleura(ctx: CanvasRenderingContext2D, v: Vista, p: Pleura): void {
  const mitad = ANCHO_SONDA_MM / 2;
  ctx.beginPath();
  for (let x = -mitad; x <= mitad; x += PASO_DIBUJO_PLEURA_MM) {
    const px = v.aPxX(x);
    const py = v.aPxY(profundidadPleura(p, x));
    if (x === -mitad) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}

function dibujarPulmonYPleura(ctx: CanvasRenderingContext2D, v: Vista, p: Pleura): void {
  trazarPleura(ctx, v, p);
  ctx.lineTo(v.aPxX(ANCHO_SONDA_MM / 2), v.altoImagen);
  ctx.lineTo(v.aPxX(-ANCHO_SONDA_MM / 2), v.altoImagen);
  ctx.closePath();
  ctx.fillStyle = COLORES_PLANO.pulmon;
  ctx.fill();
  trazarPleura(ctx, v, p);
  ctx.strokeStyle = COLORES_PLANO.pleura;
  ctx.lineWidth = GROSOR_PLEURA_PX;
  ctx.stroke();
}

const COLOR_AGUJA_PLANO = '#ffffff';

// Trombo: la parte de la vena que ocupa desde la pared posterior (recortado a la elipse)
function dibujarTromboPlano(ctx: CanvasRenderingContext2D, v: Vista, vena: Elipse, trombo: number): void {
  if (trombo <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(v.aPxX(vena.cx), v.aPxY(vena.cy), vena.rx * v.escala, vena.ry * v.escala, 0, 0, 2 * Math.PI);
  ctx.clip();
  const arriba = vena.cy + vena.ry - trombo * 2 * vena.ry;
  ctx.fillStyle = COLORES_PLANO.trombo;
  ctx.fillRect(v.izquierda, v.aPxY(arriba), v.anchoImagen, v.aPxY(vena.cy + vena.ry) - v.aPxY(arriba));
  ctx.restore();
}
const GROSOR_AGUJA_PLANO_PX = 3;

export function dibujarCortePlano(
  ctx: CanvasRenderingContext2D, anchoPx: number, altoPx: number, v: Vista, corte: Corte,
  aguja: { a: [number, number]; b: [number, number] } | null = null,
): void {
  ctx.fillStyle = COLOR_FUERA_IMAGEN;
  ctx.fillRect(0, 0, anchoPx, altoPx);

  ctx.save();
  ctx.beginPath();
  ctx.rect(v.izquierda, 0, v.anchoImagen, v.altoImagen);
  ctx.clip();

  ctx.fillStyle = COLORES_PLANO.tejido;
  ctx.fillRect(v.izquierda, 0, v.anchoImagen, v.altoImagen);
  ctx.fillStyle = COLORES_PLANO.subcutaneo;
  ctx.fillRect(v.izquierda, 0, v.anchoImagen, v.aPxY(corte.subcutaneo.profundidadMm));

  dibujarPulmonYPleura(ctx, v, corte.pleura);
  for (const haz of corte.ecm) elipse(ctx, v, haz, COLORES_PLANO.musculo);
  if (corte.tiroides) elipse(ctx, v, corte.tiroides, COLORES_PLANO.tiroides);
  const { vena, arteria } = corte;
  elipse(ctx, v, vena, COLORES_PLANO.vena);
  dibujarTromboPlano(ctx, v, vena, corte.tromboVena);
  elipse(ctx, v, { cx: arteria.cx, cy: arteria.cy, rx: arteria.r, ry: arteria.r }, COLORES_PLANO.arteria);
  if (aguja) {
    // El tramo de aguja que cruza el haz (un punto si la aguja está fuera de plano)
    ctx.strokeStyle = COLOR_AGUJA_PLANO;
    ctx.lineWidth = GROSOR_AGUJA_PLANO_PX;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(v.aPxX(aguja.a[0]), v.aPxY(aguja.a[1]));
    ctx.lineTo(v.aPxX(aguja.b[0]), v.aPxY(aguja.b[1]));
    ctx.stroke();
  }
  ctx.restore();
}

// Esquema en eje largo: cada columna es el corte a otra altura del cuello,
// visto justo bajo la línea de la sonda (x = 0). Usa los mismos datos que el shader.
const COLUMNAS_ESQUEMA = 128;

export function dibujarEjeLargoPlano(
  ctx: CanvasRenderingContext2D, anchoPx: number, altoPx: number, v: Vista, datos: Float32Array, muestras: number,
  instrumento: { a: [number, number]; b: [number, number] } | null = null,
): void {
  ctx.fillStyle = COLOR_FUERA_IMAGEN;
  ctx.fillRect(0, 0, anchoPx, altoPx);
  const anchoColumna = v.anchoImagen / COLUMNAS_ESQUEMA;
  const leer = (fila: number, i: number, k: number): number => datos[(fila * muestras + i) * 4 + k];
  // Tramo vertical (de, a) que ocupa una elipse en x = 0, o null si no la cruza
  const tramo = (fila: number, i: number): [number, number] | null => {
    const cx = leer(fila, i, 0), cy = leer(fila, i, 1), rx = leer(fila, i, 2), ry = leer(fila, i, 3);
    const u = cx / rx;
    if (Math.abs(u) >= 1) return null;
    const mitad = ry * Math.sqrt(1 - u * u);
    return [cy - mitad, cy + mitad];
  };
  for (let c = 0; c < COLUMNAS_ESQUEMA; c++) {
    const i = Math.min(Math.floor(((c + 0.5) / COLUMNAS_ESQUEMA) * muestras), muestras - 1);
    const x = v.izquierda + c * anchoColumna;
    const pintar = (color: string, de: number, a: number): void => {
      ctx.fillStyle = color;
      ctx.fillRect(x, v.aPxY(de), anchoColumna + 0.5, v.aPxY(a) - v.aPxY(de));
    };
    const pleura = leer(5, i, 0) + leer(5, i, 2) * leer(5, i, 1) ** 2;
    pintar(COLORES_PLANO.tejido, 0, v.profundidadMm);
    pintar(COLORES_PLANO.subcutaneo, 0, leer(5, i, 3));
    pintar(COLORES_PLANO.pulmon, pleura, v.profundidadMm);
    for (const [fila, color] of [[2, COLORES_PLANO.musculo], [3, COLORES_PLANO.musculo], [0, COLORES_PLANO.vena], [1, COLORES_PLANO.arteria]] as const) {
      const t = tramo(fila, i);
      if (t) pintar(color, t[0], t[1]);
    }
    // Trombo: la parte inferior de la luz venosa
    const venaTramo = tramo(0, i);
    const trombo = leer(6, i, 1);
    if (venaTramo && trombo > 0) pintar(COLORES_PLANO.trombo, venaTramo[1] - trombo * (venaTramo[1] - venaTramo[0]), venaTramo[1]);
    if (leer(6, i, 0) > 0.5) {
      const t = tramo(4, i);
      if (t) pintar(COLORES_PLANO.tiroides, t[0], t[1]);
    }
  }
  if (instrumento) {
    ctx.strokeStyle = COLOR_AGUJA_PLANO;
    ctx.lineWidth = GROSOR_AGUJA_PLANO_PX;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(v.aPxX(instrumento.a[0]), v.aPxY(instrumento.a[1]));
    ctx.lineTo(v.aPxX(instrumento.b[0]), v.aPxY(instrumento.b[1]));
    ctx.stroke();
  }
}
