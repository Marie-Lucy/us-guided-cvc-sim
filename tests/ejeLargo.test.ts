import { describe, it, expect } from 'vitest';
import { datosEjeLargo, alturaDeColumna } from '../src/ultrasonido/ejeLargo';
import { corteTransversal } from '../src/anatomia/anatomia';
import { MUESTRAS_EJE_LARGO, FILAS_EJE_LARGO } from '../src/config/ultrasonido';
import { ANCHO_SONDA_MM } from '../src/config/anatomia';

describe('eje largo', () => {
  it('la columna izquierda es el lado de la cabeza y cubre toda la huella', () => {
    expect(alturaDeColumna(0, 30)).toBeGreaterThan(30);
    expect(alturaDeColumna(MUESTRAS_EJE_LARGO - 1, 30)).toBeLessThan(30);
    expect(alturaDeColumna(0, 30) - alturaDeColumna(MUESTRAS_EJE_LARGO - 1, 30)).toBeCloseTo(
      ANCHO_SONDA_MM * (1 - 1 / MUESTRAS_EJE_LARGO),
    );
  });

  it('cada columna guarda el corte a su altura', () => {
    const datos = datosEjeLargo(30, (z) => corteTransversal(z, 0));
    expect(datos.length).toBe(MUESTRAS_EJE_LARGO * FILAS_EJE_LARGO * 4);
    const i = 10;
    const c = corteTransversal(alturaDeColumna(i, 30), 0);
    expect(datos[i * 4 + 1]).toBeCloseTo(c.vena.cy); // fila 0, componente y
    const fila5 = (5 * MUESTRAS_EJE_LARGO + i) * 4;
    expect(datos[fila5]).toBeCloseTo(c.pleura.profundidadMm);
  });
});
