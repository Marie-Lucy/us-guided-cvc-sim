import { describe, it, expect } from 'vitest';
import { evaluar, complicaciones, type EntradaEvaluacion } from '../src/evaluacion/evaluacion';
import { registroNuevo, archivarAguja, intentosTotales, eventosAguja } from '../src/evaluacion/registro';
import { estadoInicial } from '../src/aguja/aguja';
import type { EstadoSeldinger } from '../src/procedimiento/seldinger';
import * as V from '../src/config/evaluacion';

function seldingerTerminado(cambios: Partial<EstadoSeldinger> = {}): EstadoSeldinger {
  return {
    vaso: 'vena', zEntradaVaso: 25, trayectoMm: 22,
    guia: { insertadaMm: 150, resistencia: false, confirmada: true, retirada: true },
    agujaRetirada: true, dilatador: { mm: 0, tractoDilatado: true }, cateter: { mm: 140 }, eventos: [],
    ...cambios,
  };
}

const base = (cambios: Partial<EntradaEvaluacion> = {}): EntradaEvaluacion => ({
  registro: { ...registroNuevo(), comprimioVena: true, usoDoppler: true, confirmoEnEjeLargo: true },
  intentos: 1, eventosAguja: [], seldinger: seldingerTerminado(), tiempoS: 120, ...cambios,
});

describe('evaluación', () => {
  it('procedimiento perfecto: éxito y puntaje máximo', () => {
    const r = evaluar(base());
    expect(r.exito).toBe(true);
    expect(r.puntaje).toBe(V.PUNTAJE_MAXIMO);
    expect(r.calificacion).toBe('Excelente');
    expect(r.aciertos).toContain('Sin complicaciones.');
  });

  it('cada pinchazo extra descuenta', () => {
    expect(evaluar(base({ intentos: 3 })).puntaje).toBe(V.PUNTAJE_MAXIMO - 2 * V.DESCUENTO_POR_INTENTO_EXTRA);
  });

  it('el tiempo descuenta después de 5 minutos, con tope', () => {
    expect(evaluar(base({ tiempoS: V.TIEMPO_SIN_DESCUENTO_S })).puntaje).toBe(V.PUNTAJE_MAXIMO);
    expect(evaluar(base({ tiempoS: V.TIEMPO_SIN_DESCUENTO_S + 90 })).puntaje).toBe(V.PUNTAJE_MAXIMO - 3);
    expect(evaluar(base({ tiempoS: 99999 })).puntaje).toBe(V.PUNTAJE_MAXIMO - V.DESCUENTO_TIEMPO_MAXIMO);
  });

  it('una complicación grave impide el éxito aunque el catéter esté en la vena', () => {
    const r = evaluar(base({ eventosAguja: ['flash_arterial', 'puncion_carotida', 'flash_venoso'] }));
    expect(r.exito).toBe(false);
    expect(r.puntaje).toBeLessThanOrEqual(V.PUNTAJE_MAXIMO_SIN_EXITO);
    expect(r.complicaciones[0].titulo).toBe('Punción carotídea');
    expect(r.complicaciones[0].explicacion).toMatch(/no colapsa/);
  });

  it('pared posterior: moderada, con explicación de la trampa fuera de plano', () => {
    const r = evaluar(base({ eventosAguja: ['pared_posterior'] }));
    expect(r.exito).toBe(true);
    expect(r.puntaje).toBe(V.PUNTAJE_MAXIMO - V.DESCUENTO_MODERADA);
    expect(r.complicaciones[0].explicacion).toMatch(/cuerpo/);
  });

  it('dilatar la carótida es grave', () => {
    const s = seldingerTerminado({ vaso: 'arteria', eventos: ['dilatacion_arterial', 'cateter_arterial'] });
    const r = evaluar(base({ seldinger: s }));
    expect(r.exito).toBe(false);
    expect(r.complicaciones.every((c) => c.gravedad === 'grave')).toBe(true);
  });

  it('los flashes no son complicaciones y cada complicación cuenta una sola vez', () => {
    const lista = complicaciones(['flash_venoso', 'pared_posterior', 'pared_posterior', 'ectopia']);
    expect(lista.map((c) => c.tipo)).toEqual(['pared_posterior', 'ectopia']);
  });

  it('sin catéter colocado no hay éxito', () => {
    const r = evaluar(base({ seldinger: null }));
    expect(r.exito).toBe(false);
    expect(r.calificacion).toBe('Procedimiento no logrado');
  });

  it('con el tiempo del examen agotado no hay éxito aunque el catéter esté puesto', () => {
    const r = evaluar(base({ tiempoAgotado: true }));
    expect(r.exito).toBe(false);
    expect(r.calificacion).toBe('Tiempo agotado');
    expect(r.puntaje).toBeLessThanOrEqual(V.PUNTAJE_MAXIMO_SIN_EXITO);
  });

  it('con el tiempo agotado el puntaje depende de los pasos completados', () => {
    const nada = evaluar(base({ tiempoAgotado: true, pasosCompletados: 0, seldinger: null }));
    const casi = evaluar(base({ tiempoAgotado: true, pasosCompletados: 4, seldinger: null }));
    expect(nada.puntaje).toBe(0);
    expect(casi.puntaje).toBeGreaterThan(nada.puntaje);
    expect(casi.puntaje).toBeLessThanOrEqual(V.PUNTAJE_MAXIMO_SIN_EXITO);
  });

  it('si reconoció un trombo, no le pide comprimir', () => {
    const r = evaluar(base({ registro: { ...registroNuevo(), detectoTrombo: true } }));
    expect(r.consejos.some((c) => /comprime/.test(c))).toBe(false);
  });

  it('aconseja comprimir si no lo hizo', () => {
    const r = evaluar(base({ registro: registroNuevo() }));
    expect(r.consejos.some((c) => /comprime/.test(c))).toBe(true);
  });
});

describe('registro de la sesión', () => {
  it('suma intentos y eventos de las agujas descartadas', () => {
    const r = registroNuevo();
    const vieja = estadoInicial();
    vieja.intentos = 2;
    vieja.eventos = [{ tipo: 'pared_posterior', intento: 2 }];
    archivarAguja(r, vieja);
    const nueva = estadoInicial();
    nueva.intentos = 1;
    nueva.eventos = [{ tipo: 'flash_venoso', intento: 1 }];
    expect(intentosTotales(r, nueva)).toBe(3);
    expect(eventosAguja(r, nueva)).toEqual(['pared_posterior', 'flash_venoso']);
  });
});
