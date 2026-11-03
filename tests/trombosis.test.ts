import { describe, it, expect } from 'vitest';
import { corteTransversal, ocupacionTrombo, enTrombo } from '../src/anatomia/anatomia';
import { caso } from '../src/casos/casos';
import { estadoInicial, elegirEntrada, cambiarAngulo, moverAguja, actualizarFlash } from '../src/aguja/aguja';
import { motivoParaGuia } from '../src/procedimiento/seldinger';
import { evaluar } from '../src/evaluacion/evaluacion';
import { registroNuevo } from '../src/evaluacion/registro';
import { pista } from '../src/ui/guiaPasos';

const anatomia = caso('trombosis').anatomia;
const corte = (z: number, opciones = {}) => corteTransversal(z, 0, { anatomia, ...opciones });
const TRAMO_TROMBOSADO = 20;
const TRAMO_LIBRE = 50;

describe('trombo en la yugular', () => {
  it('ocupa el tramo bajo y medio, y arriba la vena está libre', () => {
    expect(corte(TRAMO_TROMBOSADO).tromboVena).toBe(1);
    expect(corte(TRAMO_LIBRE).tromboVena).toBe(0);
    // El borde superior del trombo es gradual
    const borde = ocupacionTrombo(anatomia.trombo, 37);
    expect(borde).toBeGreaterThan(0);
    expect(borde).toBeLessThan(1);
  });

  it('el segmento trombosado no colapsa al comprimir; el libre sí', () => {
    expect(corte(TRAMO_TROMBOSADO, { compresion: 1 }).aperturaVena).toBe(1);
    expect(corte(TRAMO_LIBRE, { compresion: 1 }).aperturaVena).toBeLessThan(0.15);
  });

  it('es rígido: no cambia con Valsalva ni con la respiración', () => {
    const reposo = corte(TRAMO_TROMBOSADO).vena.ry;
    expect(corte(TRAMO_TROMBOSADO, { valsalva: 1 }).vena.ry).toBeCloseTo(reposo);
    expect(corteTransversal(TRAMO_TROMBOSADO, 1.07, { anatomia }).vena.ry).toBeCloseTo(reposo);
  });

  it('un trombo parcial ocupa la parte posterior de la luz', () => {
    const v = { cx: 0, cy: 10, rx: 6, ry: 4 };
    expect(enTrombo(v, 0.5, 0, 13)).toBe(true); // cerca de la pared posterior
    expect(enTrombo(v, 0.5, 0, 7)).toBe(false); // arriba, luz libre
    expect(enTrombo(v, 0, 0, 13)).toBe(false);
  });

  it('los otros pacientes no tienen trombo', () => {
    expect(corteTransversal(TRAMO_TROMBOSADO, 0).tromboVena).toBe(0);
  });
});

describe('puncionar el trombo', () => {
  function puncionarEn(z: number) {
    const c = corte(z);
    const a = estadoInicial();
    cambiarAngulo(a, 45);
    elegirEntrada(a, c.vena.cx, z + c.vena.cy);
    for (let i = 0; i < 300 && a.insertadaMm < c.vena.cy * Math.SQRT2; i++) moverAguja(a, 0.2, (zz) => corte(zz));
    actualizarFlash(a, 1);
    return a;
  }

  it('en el trombo no hay flash, se registra la complicación y no se puede pasar la guía', () => {
    const a = puncionarEn(TRAMO_TROMBOSADO);
    expect(a.lugar).toBe('trombo');
    expect(a.flash.cantidad).toBe(0);
    expect(a.eventos.map((e) => e.tipo)).toContain('puncion_trombo');
    expect(motivoParaGuia(a)).not.toBeNull();
  });

  it('en el tramo libre, flash normal', () => {
    const a = puncionarEn(TRAMO_LIBRE);
    expect(a.lugar).toBe('vena');
    expect(a.flash.tipo).toBe('vena');
  });

  it('puncionar el trombo es grave; reconocerlo suma', () => {
    const r = evaluar({ registro: { ...registroNuevo(), detectoTrombo: true }, intentos: 1, eventosAguja: ['puncion_trombo'], seldinger: null, tiempoS: 60 });
    expect(r.complicaciones[0]).toMatchObject({ tipo: 'puncion_trombo', gravedad: 'grave' });
    expect(r.aciertos.some((t) => /trombo/.test(t))).toBe(true);
  });

  it('el mentor avisa al comprimir sobre el trombo', () => {
    const p = pista('exploracion', { registro: registroNuevo(), aguja: estadoInicial(), seldinger: null, tromboComprimido: true }, null);
    expect(p.tipo).toBe('warn');
    expect(p.texto).toMatch(/trombo/);
  });
});
