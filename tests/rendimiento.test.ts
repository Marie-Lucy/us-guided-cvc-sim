import { describe, it, expect } from 'vitest';
import { crearControlRendimiento } from '../src/core/rendimiento';
import * as R from '../src/config/rendimiento';

const correr = (c: ReturnType<typeof crearControlRendimiento>, ms: number, cuadros: number) => {
  for (let i = 0; i < cuadros; i++) c.registrar(ms);
};

describe('calidad adaptable', () => {
  it('con cuadros lentos baja la resolución hasta el mínimo y apaga las sombras', () => {
    const c = crearControlRendimiento();
    correr(c, 60, R.CUADROS_ENTRE_AJUSTES * 20);
    expect(c.calidad().escala).toBe(R.ESCALA_MINIMA);
    expect(c.calidad().sombras).toBe(false);
  });

  it('con cuadros rápidos no pasa del máximo', () => {
    const c = crearControlRendimiento();
    correr(c, 8, R.CUADROS_ENTRE_AJUSTES * 5);
    expect(c.calidad()).toEqual({ escala: R.ESCALA_MAXIMA, sombras: true });
  });

  it('se recupera cuando el equipo vuelve a ir rápido', () => {
    const c = crearControlRendimiento();
    correr(c, 60, R.CUADROS_ENTRE_AJUSTES * 3);
    const baja = c.calidad().escala;
    correr(c, 8, R.CUADROS_ENTRE_AJUSTES * 10);
    expect(c.calidad().escala).toBeGreaterThan(baja);
  });

  it('ignora los saltos de una pestaña en segundo plano', () => {
    const c = crearControlRendimiento();
    correr(c, 5000, R.CUADROS_ENTRE_AJUSTES * 3);
    expect(c.calidad().escala).toBe(R.ESCALA_MAXIMA);
  });

  it('avisa solo cuando cambia', () => {
    const c = crearControlRendimiento();
    let cambios = 0;
    for (let i = 0; i < R.CUADROS_ENTRE_AJUSTES * 3; i++) if (c.registrar(60)) cambios++;
    expect(cambios).toBeGreaterThan(0);
    expect(cambios).toBeLessThanOrEqual(3);
  });
});
