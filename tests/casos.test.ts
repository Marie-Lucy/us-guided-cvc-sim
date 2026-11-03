import { describe, it, expect } from 'vitest';
import { CASOS, caso } from '../src/casos/casos';
import { corteTransversal, profundidadPleura, type Elipse } from '../src/anatomia/anatomia';
import { POSICION_SONDA_MAX_MM } from '../src/config/anatomia';

const dentro = (e: Elipse, x: number, y: number) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 < 1;
const borde = (e: Elipse, n = 72): [number, number][] =>
  Array.from({ length: n }, (_, i) => [e.cx + e.rx * Math.cos((2 * Math.PI * i) / n), e.cy + e.ry * Math.sin((2 * Math.PI * i) / n)]);
const solapan = (a: Elipse, b: Elipse) => borde(a).some(([x, y]) => dentro(b, x, y)) || borde(b).some(([x, y]) => dentro(a, x, y));

describe.each(CASOS.map((c) => [c.id, c] as const))('caso %s', (_, c) => {
  it('ninguna estructura se encima, en reposo ni con Valsalva', () => {
    for (let s = 0; s <= POSICION_SONDA_MAX_MM; s += 4) {
      for (let t = 0; t < 5; t += 0.2) {
        for (const valsalva of [0, 1]) {
          const k = corteTransversal(s, t, { anatomia: c.anatomia, valsalva });
          const a = { cx: k.arteria.cx, cy: k.arteria.cy, rx: k.arteria.r, ry: k.arteria.r };
          expect(solapan(k.vena, a)).toBe(false);
          for (const haz of k.ecm) {
            expect(solapan(k.vena, haz)).toBe(false);
            expect(haz.cy - haz.ry).toBeGreaterThanOrEqual(k.subcutaneo.profundidadMm);
          }
          expect(k.arteria.cy + k.arteria.r).toBeLessThan(profundidadPleura(k.pleura, k.arteria.cx));
        }
      }
    }
  });
});

describe('diferencias entre casos', () => {
  const a = (id: Parameters<typeof caso>[0]) => caso(id).anatomia;

  it('obeso: los vasos están más profundos', () => {
    expect(corteTransversal(25, 0, { anatomia: a('obeso') }).vena.cy).toBeGreaterThan(corteTransversal(25, 0).vena.cy + 6);
  });

  it('hipovolémico: vena más chica que colapsa con menos presión', () => {
    const normal = corteTransversal(25, 0, { compresion: 0.2 });
    const hipo = corteTransversal(25, 0, { compresion: 0.2, anatomia: a('hipovolemico') });
    expect(hipo.aperturaVena).toBeLessThan(normal.aperturaVena);
    expect(corteTransversal(25, 0, { anatomia: a('hipovolemico') }).vena.ry).toBeLessThan(corteTransversal(25, 0).vena.ry);
    expect(hipo.tiendaMaximaVenaMm).toBeGreaterThan(normal.tiendaMaximaVenaMm);
  });

  it('variante: la vena está encima de la carótida', () => {
    const k = corteTransversal(25, 0, { anatomia: a('variante') });
    expect(Math.abs(k.vena.cx - k.arteria.cx)).toBeLessThan(2);
    expect(k.vena.cy + k.vena.ry).toBeLessThan(k.arteria.cy - k.arteria.r);
  });

  it('un id desconocido cae en el caso normal', () => {
    expect(caso('inexistente' as never).id).toBe('normal');
  });
});

describe('paciente sorpresa', () => {
  it('elige cualquiera de los pacientes según el azar', async () => {
    const { elegirSorpresa } = await import('../src/casos/casos');
    expect(elegirSorpresa(() => 0)).toBe(CASOS[0].id);
    expect(elegirSorpresa(() => 0.9999)).toBe(CASOS[CASOS.length - 1].id);
    const vistos = new Set(Array.from({ length: 200 }, (_, i) => elegirSorpresa(() => (i + 0.5) / 200)));
    expect(vistos.size).toBe(CASOS.length);
  });
});
