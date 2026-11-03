import { describe, it, expect } from 'vitest';
import { corteTransversal, pulsoCardiaco, cicloRespiratorio, profundidadPleura, type Elipse } from '../src/anatomia/anatomia';
import { ANATOMIA_NORMAL, POSICION_SONDA_MAX_MM, AMPLITUD_PULSO_ARTERIAL } from '../src/config/anatomia';

const dentro = (e: Elipse, x: number, y: number): boolean => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 < 1;
const borde = (e: Elipse, n = 72): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [e.cx + e.rx * Math.cos(a), e.cy + e.ry * Math.sin(a)];
  });
const solapan = (a: Elipse, b: Elipse): boolean =>
  borde(a).some(([x, y]) => dentro(b, x, y)) || borde(b).some(([x, y]) => dentro(a, x, y));

// Recorre todas las posiciones de la sonda y varios ciclos cardiacos y respiratorios
function* cortes() {
  for (let s = 0; s <= POSICION_SONDA_MAX_MM; s += 2) {
    for (let t = 0; t < 5; t += 0.1) yield corteTransversal(s, t);
  }
}

describe('modelo anatómico', () => {
  it('ninguna estructura se encima con otra en ninguna posición ni instante', () => {
    for (const c of cortes()) {
      const arteria = { cx: c.arteria.cx, cy: c.arteria.cy, rx: c.arteria.r, ry: c.arteria.r };
      expect(solapan(c.vena, arteria)).toBe(false);
      for (const haz of c.ecm) {
        expect(solapan(c.vena, haz)).toBe(false);
        expect(solapan(arteria, haz)).toBe(false);
      }
      if (c.tiroides) expect(solapan(c.tiroides, arteria)).toBe(false);
      expect(c.vena.cy + c.vena.ry).toBeLessThan(profundidadPleura(c.pleura, c.vena.cx));
      expect(c.arteria.cy + c.arteria.r).toBeLessThan(profundidadPleura(c.pleura, c.arteria.cx));
    }
  });

  it('el ECM queda debajo del subcutáneo', () => {
    for (const c of cortes()) {
      for (const haz of c.ecm) expect(haz.cy - haz.ry).toBeGreaterThanOrEqual(c.subcutaneo.profundidadMm);
    }
  });

  it('la vena es lateral y más superficial que la arteria', () => {
    for (const c of cortes()) {
      expect(c.vena.cx).toBeLessThan(c.arteria.cx);
      expect(c.vena.cy).toBeLessThan(c.arteria.cy);
    }
  });

  it('la pleura se hunde al subir la sonda', () => {
    const abajo = corteTransversal(0, 0).pleura.profundidadMm;
    const arriba = corteTransversal(30, 0).pleura.profundidadMm;
    expect(abajo).toBe(ANATOMIA_NORMAL.pleura.profundidadEnClaviculaMm);
    expect(arriba).toBeGreaterThan(abajo);
  });

  it('la tiroides solo aparece en su franja', () => {
    expect(corteTransversal(0, 0).tiroides).toBeNull();
    expect(corteTransversal(25, 0).tiroides).not.toBeNull();
    expect(corteTransversal(60, 0).tiroides).toBeNull();
  });

  it('el ECM está en dos haces abajo y en un vientre arriba', () => {
    const [latBajo, medBajo] = corteTransversal(0, 0).ecm;
    const [latAlto, medAlto] = corteTransversal(60, 0).ecm;
    expect(medBajo.cx - latBajo.cx).toBeGreaterThan(0);
    expect(medAlto.cx).toBeCloseTo(latAlto.cx);
  });

  it('mover la sonda hacia medial corre las estructuras hacia lateral', () => {
    const centro = corteTransversal(20, 0);
    const medial = corteTransversal(20, 0, { lateralMm: 5 });
    expect(medial.vena.cx).toBeCloseTo(centro.vena.cx - 5);
    expect(medial.arteria.cx).toBeCloseTo(centro.arteria.cx - 5);
  });
});

describe('fisiología', () => {
  it('la onda de pulso va de 0 a 1 y se repite cada latido', () => {
    const valores = Array.from({ length: 2000 }, (_, i) => pulsoCardiaco(i / 1000));
    expect(Math.min(...valores)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...valores)).toBeCloseTo(1, 2);
    expect(pulsoCardiaco(0.3)).toBeCloseTo(pulsoCardiaco(0.3 + 60 / 75));
  });

  it('el radio arterial pulsa como mucho lo indicado en config', () => {
    const r0 = ANATOMIA_NORMAL.alto.arteriaR;
    const radios = Array.from({ length: 200 }, (_, i) => corteTransversal(60, i / 100).arteria.r);
    expect(Math.max(...radios)).toBeLessThanOrEqual(r0 * (1 + AMPLITUD_PULSO_ARTERIAL) + 1e-9);
    expect(Math.min(...radios)).toBeGreaterThanOrEqual(r0);
  });

  it('la vena se achica en inspiración', () => {
    const tInspiracion = 60 / 14 / 4; // un cuarto del ciclo respiratorio
    expect(cicloRespiratorio(tInspiracion)).toBeCloseTo(1);
    expect(corteTransversal(20, tInspiracion).vena.ry).toBeLessThan(corteTransversal(20, 0).vena.ry);
  });
});
