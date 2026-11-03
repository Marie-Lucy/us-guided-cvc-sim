import { describe, it, expect } from 'vitest';
import { corteTransversal, aperturaPorPresion, presionSonda, hundimiento, type Elipse } from '../src/anatomia/anatomia';
import {
  PRESION_VENOSA_MMHG, PRESION_SONDA_MAX_MMHG, FRACCION_MINIMA_COLAPSO, POSICION_SONDA_MAX_MM,
} from '../src/config/anatomia';

const T = 0; // instante fijo para comparar
const dentro = (e: Elipse, x: number, y: number): boolean => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 < 1;
const borde = (e: Elipse, n = 72): [number, number][] =>
  Array.from({ length: n }, (_, i) => [e.cx + e.rx * Math.cos((2 * Math.PI * i) / n), e.cy + e.ry * Math.sin((2 * Math.PI * i) / n)]);
const solapan = (a: Elipse, b: Elipse): boolean =>
  borde(a).some(([x, y]) => dentro(b, x, y)) || borde(b).some(([x, y]) => dentro(a, x, y));

describe('ley del tubo', () => {
  it('abierto con presión transmural positiva, colapsado con negativa', () => {
    expect(aperturaPorPresion(10)).toBe(1);
    expect(aperturaPorPresion(0)).toBe(1);
    expect(aperturaPorPresion(-6)).toBeCloseTo(0.5);
    expect(aperturaPorPresion(-100)).toBe(FRACCION_MINIMA_COLAPSO);
  });

  it('la presión de la sonda va de 0 al máximo', () => {
    expect(presionSonda(0)).toBe(0);
    expect(presionSonda(1)).toBe(PRESION_SONDA_MAX_MMHG);
    expect(presionSonda(2)).toBe(PRESION_SONDA_MAX_MMHG);
  });
});

describe('compresión con la sonda', () => {
  it('con presión máxima la vena colapsa y la carótida no', () => {
    const libre = corteTransversal(25, T);
    const comprimido = corteTransversal(25, T, { compresion: 1 });
    expect(comprimido.vena.ry).toBeLessThan(libre.vena.ry * 0.15);
    expect(comprimido.arteria.r).toBeCloseTo(libre.arteria.r);
  });

  it('una presión menor que la venosa no cambia la vena', () => {
    const c = (PRESION_VENOSA_MMHG * 0.9) / PRESION_SONDA_MAX_MMHG;
    expect(corteTransversal(25, T, { compresion: c }).aperturaVena).toBe(1);
  });

  it('la vena se aplasta desde arriba: su pared posterior apenas se mueve', () => {
    const libre = corteTransversal(25, T);
    const comprimido = corteTransversal(25, T, { compresion: 1 });
    const fondoLibre = libre.vena.cy + libre.vena.ry;
    const fondoComprimido = comprimido.vena.cy + comprimido.vena.ry;
    // Solo sube lo que sube todo el tejido a esa profundidad
    expect(fondoLibre - fondoComprimido).toBeCloseTo(hundimiento(fondoLibre, 1), 1);
    expect(comprimido.vena.cy).toBeGreaterThan(libre.vena.cy);
  });

  it('la vena colapsada se ensancha hacia los lados', () => {
    expect(corteTransversal(25, T, { compresion: 1 }).vena.rx).toBeGreaterThan(corteTransversal(25, T).vena.rx);
  });

  it('el tejido superficial se hunde más que el profundo', () => {
    expect(hundimiento(2, 1)).toBeLessThan(hundimiento(30, 1));
    expect(hundimiento(10, 0)).toBe(0);
  });
});

describe('Valsalva', () => {
  it('agranda la vena', () => {
    expect(corteTransversal(25, T, { valsalva: 1 }).vena.ry).toBeGreaterThan(corteTransversal(25, T).vena.ry);
  });

  it('hace que la vena sea más difícil de colapsar', () => {
    const c = 0.4;
    const normal = corteTransversal(25, T, { compresion: c }).aperturaVena;
    const conValsalva = corteTransversal(25, T, { compresion: c, valsalva: 1 }).aperturaVena;
    expect(conValsalva).toBeGreaterThan(normal);
  });

  it('con Valsalva la vena tampoco se encima con la carótida', () => {
    for (let s = 0; s <= POSICION_SONDA_MAX_MM; s += 2) {
      for (let t = 0; t < 5; t += 0.1) {
        const c = corteTransversal(s, t, { valsalva: 1 });
        const a = { cx: c.arteria.cx, cy: c.arteria.cy, rx: c.arteria.r, ry: c.arteria.r };
        expect(solapan(c.vena, a)).toBe(false);
      }
    }
  });
});
