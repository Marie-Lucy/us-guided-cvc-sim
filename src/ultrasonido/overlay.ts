// Lo que el ecógrafo dibuja encima de la imagen: regla de profundidad, foco,
// marca de orientación, parámetros y (opcional) nombres de las estructuras.

import type { Corte } from '../anatomia/anatomia';
import type { AjustesUS } from './ajustes';
import { gananciaPorcentaje } from './ajustes';
import type { Vista } from './vista';
import { limitar } from '../core/matematica';
import {
  FOCO_MM, FRECUENCIA_SONDA_MHZ, COLOR_TEXTO_EQUIPO, COLOR_ETIQUETA, FUENTE_EQUIPO, FUENTE_ETIQUETAS,
  MM_POR_CM, PASO_MARCA_CORTA_MM, PASO_MARCA_LARGA_MM, LARGO_MARCA_CORTA_PX, LARGO_MARCA_LARGA_PX,
  TAMANO_MARCADOR_FOCO_PX, RADIO_MARCADOR_ORIENTACION_PX, MARGEN_EQUIPO_PX, INTERLINEADO_EQUIPO_PX,
  DOPPLER_SEMIANCHO_MM, DOPPLER_ARRIBA_MM, DOPPLER_ABAJO_MM, COLOR_DOPPLER_CAJA,
} from '../config/ultrasonido';


function regla(ctx: CanvasRenderingContext2D, v: Vista): void {
  const borde = v.izquierda + v.anchoImagen + 2;
  ctx.strokeStyle = COLOR_TEXTO_EQUIPO;
  ctx.fillStyle = COLOR_TEXTO_EQUIPO;
  ctx.lineWidth = 1;
  ctx.font = FUENTE_EQUIPO;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let mm = PASO_MARCA_CORTA_MM; mm <= v.profundidadMm; mm += PASO_MARCA_CORTA_MM) {
    const larga = mm % PASO_MARCA_LARGA_MM === 0;
    const y = Math.min(v.aPxY(mm), v.altoImagen - 1);
    ctx.beginPath();
    ctx.moveTo(borde, y);
    ctx.lineTo(borde + (larga ? LARGO_MARCA_LARGA_PX : LARGO_MARCA_CORTA_PX), y);
    ctx.stroke();
    // El último número se apoya sobre la marca para que no quede cortado
    ctx.textBaseline = mm + PASO_MARCA_CORTA_MM > v.profundidadMm ? 'bottom' : 'middle';
    if (larga) ctx.fillText(String(mm / MM_POR_CM), borde + LARGO_MARCA_LARGA_PX + 3, y);
  }
}

function marcadorFoco(ctx: CanvasRenderingContext2D, v: Vista): void {
  const x = v.izquierda + v.anchoImagen + 2;
  const y = v.aPxY(FOCO_MM);
  const t = TAMANO_MARCADOR_FOCO_PX;
  ctx.fillStyle = COLOR_TEXTO_EQUIPO;
  ctx.beginPath();
  ctx.moveTo(x + t * 2.2, y);
  ctx.lineTo(x + t * 2.2 + t, y - t);
  ctx.lineTo(x + t * 2.2 + t, y + t);
  ctx.closePath();
  ctx.fill();
}

// El punto marca el lado de la imagen que corresponde a la marca de la sonda
// (hacia la izquierda del operador = medial).
function marcadorOrientacion(ctx: CanvasRenderingContext2D, v: Vista): void {
  ctx.fillStyle = COLOR_TEXTO_EQUIPO;
  ctx.beginPath();
  ctx.arc(
    v.izquierda - MARGEN_EQUIPO_PX, MARGEN_EQUIPO_PX + RADIO_MARCADOR_ORIENTACION_PX,
    RADIO_MARCADOR_ORIENTACION_PX, 0, 2 * Math.PI,
  );
  ctx.fill();
}

function parametros(ctx: CanvasRenderingContext2D, v: Vista, a: AjustesUS): void {
  const lineas = [
    `L ${FRECUENCIA_SONDA_MHZ} MHz`,
    `Gan ${gananciaPorcentaje(a.gananciaDb)}%`,
    `Prof ${(a.profundidadMm / MM_POR_CM).toFixed(1)} cm`,
  ];
  ctx.fillStyle = COLOR_TEXTO_EQUIPO;
  ctx.font = FUENTE_EQUIPO;
  ctx.textBaseline = 'top';
  const anchoTexto = Math.max(...lineas.map((t) => ctx.measureText(t).width));
  // Si no cabe en el margen negro (pantallas angostas), va abajo dentro de la imagen
  const cabeAlLado = v.izquierda >= anchoTexto + MARGEN_EQUIPO_PX * 2;
  ctx.textAlign = cabeAlLado ? 'right' : 'left';
  const x = cabeAlLado ? v.izquierda - MARGEN_EQUIPO_PX : v.izquierda + MARGEN_EQUIPO_PX;
  const y0 = cabeAlLado
    ? MARGEN_EQUIPO_PX * 3
    : v.altoImagen - MARGEN_EQUIPO_PX - lineas.length * INTERLINEADO_EQUIPO_PX;
  lineas.forEach((texto, i) => ctx.fillText(texto, x, y0 + i * INTERLINEADO_EQUIPO_PX));
}

// Recuadro de color del Doppler y la barra de escala (rojo arriba = hacia la sonda)
function cajaDoppler(ctx: CanvasRenderingContext2D, v: Vista): void {
  const x0 = v.aPxX(-DOPPLER_SEMIANCHO_MM);
  const x1 = v.aPxX(DOPPLER_SEMIANCHO_MM);
  const y0 = v.aPxY(DOPPLER_ARRIBA_MM);
  const y1 = Math.min(v.aPxY(DOPPLER_ABAJO_MM), v.altoImagen);
  ctx.strokeStyle = COLOR_DOPPLER_CAJA;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

  // Barra de escala junto a la esquina superior derecha de la imagen
  const ancho = 6;
  const alto = 60;
  const x = v.izquierda + v.anchoImagen - MARGEN_EQUIPO_PX - ancho;
  const y = MARGEN_EQUIPO_PX;
  const barra = ctx.createLinearGradient(0, y, 0, y + alto);
  barra.addColorStop(0, '#ffd93b');
  barra.addColorStop(0.45, '#8c0505');
  barra.addColorStop(0.5, '#000000');
  barra.addColorStop(0.55, '#05149a');
  barra.addColorStop(1, '#5ad8ff');
  ctx.fillStyle = barra;
  ctx.fillRect(x, y, ancho, alto);
}

function avisos(ctx: CanvasRenderingContext2D, v: Vista, textos: string[]): void {
  ctx.fillStyle = COLOR_ETIQUETA;
  ctx.font = FUENTE_EQUIPO;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  textos.forEach((t, i) => ctx.fillText(t, v.izquierda + MARGEN_EQUIPO_PX, MARGEN_EQUIPO_PX + i * INTERLINEADO_EQUIPO_PX));
}

function etiqueta(ctx: CanvasRenderingContext2D, v: Vista, texto: string, xMm: number, yMm: number): void {
  if (yMm > v.profundidadMm) return;
  ctx.font = FUENTE_ETIQUETAS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mitad = ctx.measureText(texto).width / 2;
  const x = limitar(v.aPxX(xMm), v.izquierda + mitad, v.izquierda + v.anchoImagen - mitad);
  ctx.fillStyle = COLOR_ETIQUETA;
  ctx.fillText(texto, x, v.aPxY(yMm));
}

function etiquetas(ctx: CanvasRenderingContext2D, v: Vista, corte: Corte): void {
  etiqueta(ctx, v, 'VYI', corte.vena.cx, corte.vena.cy);
  etiqueta(ctx, v, 'ACC', corte.arteria.cx, corte.arteria.cy);
  etiqueta(ctx, v, 'ECM', corte.ecm[1].cx, corte.ecm[1].cy);
  if (corte.tiroides) etiqueta(ctx, v, 'Tiroides', corte.tiroides.cx, corte.tiroides.cy);
}

// No borra el canvas: quien llama decide si va sobre la ecografía o sobre el esquema.
export function dibujarOverlay(
  ctx: CanvasRenderingContext2D, v: Vista, a: AjustesUS, corte: Corte, textosAviso: string[] = [],
): void {
  if (a.doppler && !a.esquema) cajaDoppler(ctx, v);
  avisos(ctx, v, textosAviso);
  regla(ctx, v);
  marcadorFoco(ctx, v);
  marcadorOrientacion(ctx, v);
  parametros(ctx, v, a);
  if (a.etiquetas) etiquetas(ctx, v, corte);
}
