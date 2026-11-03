// Conversión entre milímetros del corte y píxeles de la pantalla.
// La imagen ocupa la huella de la sonda × la profundidad elegida, centrada
// horizontalmente y pegada arriba, como en un ecógrafo.
// Orientación: el operador está en la cabecera con la marca de la sonda hacia
// su izquierda, así que la izquierda de la pantalla es MEDIAL (x positivo del
// modelo) y la derecha es LATERAL, igual que en la vista 3D.

import { ANCHO_SONDA_MM } from '../config/anatomia';

export interface Vista {
  escala: number; // px por mm
  izquierda: number; // px del borde izquierdo de la imagen
  anchoImagen: number; // px
  altoImagen: number; // px
  profundidadMm: number;
  aPxX: (xMm: number) => number;
  aPxY: (yMm: number) => number;
  aMmX: (xPx: number) => number;
  aMmY: (yPx: number) => number;
}

export function calcularVista(anchoPx: number, altoPx: number, profundidadMm: number): Vista {
  const escala = Math.min(anchoPx / ANCHO_SONDA_MM, altoPx / profundidadMm);
  const anchoImagen = ANCHO_SONDA_MM * escala;
  const izquierda = (anchoPx - anchoImagen) / 2;
  return {
    escala, izquierda, anchoImagen, altoImagen: profundidadMm * escala, profundidadMm,
    aPxX: (xMm) => izquierda + (ANCHO_SONDA_MM / 2 - xMm) * escala,
    aPxY: (yMm) => yMm * escala,
    aMmX: (xPx) => ANCHO_SONDA_MM / 2 - (xPx - izquierda) / escala,
    aMmY: (yPx) => yPx / escala,
  };
}
