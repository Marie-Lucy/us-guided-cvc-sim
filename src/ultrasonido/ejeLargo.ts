// Datos de la anatomía a lo largo de la huella de la sonda, para la vista en eje largo.
// Cada columna es el corte transversal a esa altura del cuello; el shader lo
// evalúa en x = 0 (justo bajo la línea de la sonda).

import type { Corte } from '../anatomia/anatomia';
import { ANCHO_SONDA_MM } from '../config/anatomia';
import { MUESTRAS_EJE_LARGO, FILAS_EJE_LARGO } from '../config/ultrasonido';

const COMPONENTES = 4; // RGBA

// Altura del cuello (z) de la columna i. La columna 0 es el borde izquierdo de la imagen,
// que en eje largo es el lado de la cabeza (z mayor).
export function alturaDeColumna(i: number, posicionSondaMm: number): number {
  const u = (i + 0.5) / MUESTRAS_EJE_LARGO;
  return posicionSondaMm + ANCHO_SONDA_MM / 2 - u * ANCHO_SONDA_MM;
}

// Filas: 0 vena, 1 arteria, 2 y 3 haces del ECM, 4 tiroides,
// 5 (pleura: profundidad, vértice x, curvatura; subcutáneo), 6 (hay tiroides, trombo).
export function datosEjeLargo(posicionSondaMm: number, cortePorAltura: (z: number) => Corte): Float32Array {
  const datos = new Float32Array(MUESTRAS_EJE_LARGO * FILAS_EJE_LARGO * COMPONENTES);
  const poner = (fila: number, i: number, valores: [number, number, number, number]): void => {
    datos.set(valores, (fila * MUESTRAS_EJE_LARGO + i) * COMPONENTES);
  };
  for (let i = 0; i < MUESTRAS_EJE_LARGO; i++) {
    const c = cortePorAltura(alturaDeColumna(i, posicionSondaMm));
    const t = c.tiroides;
    poner(0, i, [c.vena.cx, c.vena.cy, c.vena.rx, c.vena.ry]);
    poner(1, i, [c.arteria.cx, c.arteria.cy, c.arteria.r, c.arteria.r]);
    poner(2, i, [c.ecm[0].cx, c.ecm[0].cy, c.ecm[0].rx, c.ecm[0].ry]);
    poner(3, i, [c.ecm[1].cx, c.ecm[1].cy, c.ecm[1].rx, c.ecm[1].ry]);
    poner(4, i, t ? [t.cx, t.cy, t.rx, t.ry] : [0, 0, 1, 1]);
    poner(5, i, [c.pleura.profundidadMm, c.pleura.verticeX, c.pleura.curvatura, c.subcutaneo.profundidadMm]);
    poner(6, i, [t ? 1 : 0, c.tromboVena, 0, 0]);
  }
  return datos;
}
