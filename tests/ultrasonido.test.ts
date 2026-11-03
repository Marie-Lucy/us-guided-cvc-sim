import { describe, it, expect, beforeEach } from 'vitest';
import { calcularVista } from '../src/ultrasonido/vista';
import {
  obtenerAjustes, cambiarGanancia, cambiarProfundidad, gananciaPorcentaje,
} from '../src/ultrasonido/ajustes';
import { parametrosShader } from '../src/ultrasonido/parametros';
import { FRAGMENT_SHADER } from '../src/ultrasonido/shader';
import { corteTransversal } from '../src/anatomia/anatomia';
import { ANCHO_SONDA_MM } from '../src/config/anatomia';
import {
  GANANCIA_MIN_DB, GANANCIA_MAX_DB, PROFUNDIDAD_MIN_MM, PROFUNDIDAD_MAX_MM, PROFUNDIDAD_INICIAL_MM,
  GANANCIA_INICIAL_DB, ATENUACION_SANGRE_DB_MM, ATENUACION_TEJIDO_DB_MM, R_SANGRE, R_MUSCULO, R_TEJIDO, R_TIROIDES,
} from '../src/config/ultrasonido';

describe('vista mm ↔ px', () => {
  it('la imagen cabe en el canvas y respeta la proporción en mm', () => {
    const v = calcularVista(800, 600, 40);
    expect(v.altoImagen).toBeLessThanOrEqual(600);
    expect(v.anchoImagen).toBeLessThanOrEqual(800);
    expect(v.anchoImagen / v.altoImagen).toBeCloseTo(ANCHO_SONDA_MM / 40);
  });

  it('el centro de la sonda queda en el centro horizontal', () => {
    const v = calcularVista(800, 600, 40);
    expect(v.aPxX(0)).toBeCloseTo(400);
    expect(v.aPxY(0)).toBe(0);
  });

  it('la izquierda de la pantalla es medial (x positivo)', () => {
    const v = calcularVista(800, 600, 40);
    expect(v.aPxX(10)).toBeLessThan(v.aPxX(-10));
  });

  it('ida y vuelta mm → px → mm da lo mismo', () => {
    const v = calcularVista(640, 480, 55);
    expect(v.aMmX(v.aPxX(-7.3))).toBeCloseTo(-7.3);
    expect(v.aMmY(v.aPxY(21.4))).toBeCloseTo(21.4);
  });

  it('más profundidad = más mm en la misma altura (escala menor)', () => {
    expect(calcularVista(800, 600, 60).escala).toBeLessThan(calcularVista(800, 600, 30).escala);
  });
});

describe('ajustes del ecógrafo', () => {
  beforeEach(() => {
    cambiarGanancia(GANANCIA_INICIAL_DB);
    cambiarProfundidad(PROFUNDIDAD_INICIAL_MM);
  });

  it('la ganancia y la profundidad se quedan dentro de sus límites', () => {
    cambiarGanancia(999);
    cambiarProfundidad(999);
    expect(obtenerAjustes().gananciaDb).toBe(GANANCIA_MAX_DB);
    expect(obtenerAjustes().profundidadMm).toBe(PROFUNDIDAD_MAX_MM);
    cambiarGanancia(-999);
    cambiarProfundidad(0);
    expect(obtenerAjustes().gananciaDb).toBe(GANANCIA_MIN_DB);
    expect(obtenerAjustes().profundidadMm).toBe(PROFUNDIDAD_MIN_MM);
  });

  it('la profundidad salta al paso más cercano', () => {
    cambiarProfundidad(43);
    expect(obtenerAjustes().profundidadMm).toBe(45);
  });

  it('la ganancia se muestra de 0 a 100 %', () => {
    expect(gananciaPorcentaje(GANANCIA_MIN_DB)).toBe(0);
    expect(gananciaPorcentaje(GANANCIA_MAX_DB)).toBe(100);
  });
});

const FISIO = { lateralMm: 0, respiracion: 0.5, pulso: 0.3, tiempo: 1 };

describe('parámetros del shader', () => {
  const corte = corteTransversal(25, 0);
  const vista = calcularVista(800, 600, 40);
  const p = parametrosShader(corte, obtenerAjustes(), vista, 2, 1600, 1200, FISIO);

  it('pasa la geometría en píxeles reales del buffer', () => {
    expect(p.escala).toBeCloseTo(vista.escala * 2);
    expect(p.izquierda).toBeCloseTo(vista.izquierda * 2);
    expect(p.resolucion).toEqual([1600, 1200]);
  });

  it('pasa los vasos tal cual salen del modelo anatómico', () => {
    expect(p.vena).toEqual([corte.vena.cx, corte.vena.cy, corte.vena.rx, corte.vena.ry]);
    expect(p.arteria).toEqual([corte.arteria.cx, corte.arteria.cy, corte.arteria.r, corte.arteria.r]);
  });

  it('sin flujo en la vena colapsada', () => {
    const colapsada = parametrosShader(corteTransversal(25, 0, { compresion: 1 }), obtenerAjustes(), vista, 1, 800, 600, FISIO);
    expect(colapsada.flujoVena).toBeLessThan(0.01);
    expect(p.flujoVena).toBe(1);
  });

  it('marca cuando no hay tiroides en el corte', () => {
    const sin = parametrosShader(corteTransversal(0, 0), obtenerAjustes(), vista, 1, 800, 600, FISIO);
    expect(sin.hayTiroides).toBe(0);
    expect(p.hayTiroides).toBe(1);
  });
});

describe('reglas físicas de la imagen', () => {
  it('la sangre es el tejido menos ecogénico y la tiroides más que el músculo', () => {
    expect(R_SANGRE).toBeLessThan(R_MUSCULO);
    expect(R_MUSCULO).toBeLessThan(R_TEJIDO);
    expect(R_TIROIDES).toBeGreaterThan(R_TEJIDO);
  });

  it('la sangre atenúa menos que el tejido (refuerzo posterior)', () => {
    expect(ATENUACION_SANGRE_DB_MM).toBeLessThan(ATENUACION_TEJIDO_DB_MM);
  });

  it('el shader no tiene constantes sin definir', () => {
    expect(FRAGMENT_SHADER).not.toMatch(/undefined|NaN/);
  });
});

describe('guía visible en la imagen', () => {
  it('transversal: solo a las alturas que la guía ocupa', async () => {
    const { dispositivoVisible } = await import('../src/ultrasonido/parametros');
    const d = { vaso: 'vena' as const, desdeZ: 5, hastaZ: 30, radio: 0.45, brillo: 1 };
    const plano = (nivel: number) => ({ orientacion: 'transversal' as const, nivel, lateral: 0 });
    expect(dispositivoVisible(d, plano(20), corteTransversal(20, 0))).toBe(true);
    expect(dispositivoVisible(d, plano(40), corteTransversal(40, 0))).toBe(false);
  });

  it('eje largo: la sonda tiene que estar alineada con la vena (dentro del grosor del haz)', async () => {
    const { dispositivoVisible } = await import('../src/ultrasonido/parametros');
    const d = { vaso: 'vena' as const, desdeZ: 0, hastaZ: 40, radio: 0.45, brillo: 1 };
    const venaX = corteTransversal(20, 0).vena.cx;
    const alineada = { orientacion: 'longitudinal' as const, nivel: 20, lateral: venaX };
    const corrida = { orientacion: 'longitudinal' as const, nivel: 20, lateral: venaX + 4 };
    expect(dispositivoVisible(d, alineada, corteTransversal(20, 0, { lateralMm: venaX }))).toBe(true);
    expect(dispositivoVisible(d, corrida, corteTransversal(20, 0, { lateralMm: venaX + 4 }))).toBe(false);
  });
});
