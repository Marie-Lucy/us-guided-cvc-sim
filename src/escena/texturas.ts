// Texturas generadas con canvas: no hace falta descargar imágenes.

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const TAMANO_TEXTURA_PX = 512;
const TAMANO_TRAMA_PX = 128;

// Ruido de valor sencillo y estable para pintar las texturas.
function ruido(semilla: number): (x: number, y: number) => number {
  const h = (x: number, y: number): number => {
    const s = Math.sin(x * 127.1 + y * 311.7 + semilla * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function lienzo(tamano: number, pintar: (x: number, y: number) => [number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tamano;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(tamano, tamano);
  for (let y = 0; y < tamano; y++) {
    for (let x = 0; x < tamano; x++) {
      const [r, g, b] = pintar(x, y);
      const i = (y * tamano + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Piel: variación suave de tono, poros finos y vetas del antiséptico.
export function texturasPiel(): { color: CanvasTexture; relieve: CanvasTexture } {
  const grande = ruido(1), fino = ruido(2), vetas = ruido(3);
  const color = lienzo(TAMANO_TEXTURA_PX, (x, y) => {
    const g = grande(x / 70, y / 70);
    const v = vetas(x / 160, y / 18); // pinceladas del antiséptico
    const f = 0.92 + 0.06 * g + 0.05 * (v - 0.5);
    return [255 * f, 236 * f, 222 * f];
  });
  const relieve = lienzo(TAMANO_TEXTURA_PX, (x, y) => {
    const poro = fino(x / 2.2, y / 2.2);
    const pliegue = grande(x / 9, y / 40);
    const n = 255 * (0.55 + 0.3 * poro + 0.15 * pliegue);
    return [n, n, n];
  });
  const texColor = new CanvasTexture(color);
  texColor.colorSpace = SRGBColorSpace;
  const texRelieve = new CanvasTexture(relieve);
  for (const t of [texColor, texRelieve]) t.wrapS = t.wrapT = RepeatWrapping;
  return { color: texColor, relieve: texRelieve };
}

// Tela del campo: trama fina.
export function texturaTela(): CanvasTexture {
  const n = ruido(4);
  const canvas = lienzo(TAMANO_TRAMA_PX, (x, y) => {
    const trama = 0.5 + 0.25 * Math.sin(x * 1.9) * Math.sin(y * 1.9) + 0.25 * n(x / 3, y / 3);
    const v = 255 * trama;
    return [v, v, v];
  });
  const t = new CanvasTexture(canvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

// Campo estéril: color de la tela con el borde adhesivo blanco, y un canal
// alfa que recorta la ventana con borde suave (mejor que quitar triángulos).
// u recorre x de izquierda a derecha; v = 1 en el borde de z mínimo.
export function texturasCampo(
  tamanoPx: number, anchoMm: number, largoMm: number, centroZMm: number,
  dentro: (x: number, z: number, margen: number) => boolean,
  colorTela: string, colorAdhesivo: string, bordeMm: number,
): { color: CanvasTexture; alfa: CanvasTexture } {
  const aMm = (i: number, j: number): [number, number] => [
    (i / tamanoPx - 0.5) * anchoMm,
    centroZMm - (0.5 - j / tamanoPx) * largoMm,
  ];
  // Recorre el contorno de la ventana (con margen) y lo dibuja como un camino
  const contorno = (ctx: CanvasRenderingContext2D, margen: number): void => {
    const PASOS = 720;
    ctx.beginPath();
    // Busca, para cada dirección desde el centro, dónde termina la ventana
    let cx = 0, cz = 0, n = 0;
    for (let i = 0; i < tamanoPx; i += 16) {
      for (let j = 0; j < tamanoPx; j += 16) {
        const [x, z] = aMm(i, j);
        if (dentro(x, z, margen)) { cx += x; cz += z; n++; }
      }
    }
    cx /= n; cz /= n;
    for (let k = 0; k <= PASOS; k++) {
      const ang = (2 * Math.PI * k) / PASOS;
      let r = 0;
      const PASO_MM = 0.25;
      while (dentro(cx + r * Math.cos(ang), cz + r * Math.sin(ang), margen)) r += PASO_MM;
      const x = cx + r * Math.cos(ang);
      const z = cz + r * Math.sin(ang);
      const i = (x / anchoMm + 0.5) * tamanoPx;
      const j = (0.5 - (centroZMm - z) / largoMm) * tamanoPx;
      if (k === 0) ctx.moveTo(i, j); else ctx.lineTo(i, j);
    }
    ctx.closePath();
  };

  const lienzoColor = document.createElement('canvas');
  lienzoColor.width = lienzoColor.height = tamanoPx;
  const c = lienzoColor.getContext('2d')!;
  c.fillStyle = colorTela;
  c.fillRect(0, 0, tamanoPx, tamanoPx);
  c.fillStyle = colorAdhesivo;
  contorno(c, bordeMm);
  c.fill();

  const lienzoAlfa = document.createElement('canvas');
  lienzoAlfa.width = lienzoAlfa.height = tamanoPx;
  const a = lienzoAlfa.getContext('2d')!;
  a.fillStyle = '#ffffff';
  a.fillRect(0, 0, tamanoPx, tamanoPx);
  a.fillStyle = '#000000';
  contorno(a, 0);
  a.fill();

  const color = new CanvasTexture(lienzoColor);
  color.colorSpace = SRGBColorSpace;
  return { color, alfa: new CanvasTexture(lienzoAlfa) };
}
