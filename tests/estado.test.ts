import { describe, it, expect, beforeEach } from 'vitest';
import { FASES, TRANSICIONES, FASE_INICIAL } from '../src/config/fases';
import { obtenerEstado, irA, reiniciar, actualizar, puedeIrA, alCambiarFase } from '../src/core/estado';

describe('máquina de estados', () => {
  beforeEach(() => reiniciar());

  it('empieza en exploración con relojes en cero', () => {
    expect(obtenerEstado()).toEqual({ fase: FASE_INICIAL, tiempoEnFase: 0, tiempoTotal: 0 });
  });

  it('recorre el procedimiento completo y vuelve al inicio', () => {
    for (const fase of ['puncion', 'guia', 'dilatacion', 'cateter', 'evaluacion', 'exploracion'] as const) {
      expect(irA(fase)).toBe(true);
      expect(obtenerEstado().fase).toBe(fase);
    }
  });

  it('rechaza saltarse fases', () => {
    expect(puedeIrA('dilatacion')).toBe(false);
    expect(irA('dilatacion')).toBe(false);
    expect(obtenerEstado().fase).toBe('exploracion');
  });

  it('toda fase tiene al menos una salida y solo apunta a fases que existen', () => {
    for (const fase of FASES) {
      expect(TRANSICIONES[fase].length).toBeGreaterThan(0);
      for (const destino of TRANSICIONES[fase]) expect(FASES).toContain(destino);
    }
  });

  it('el reloj de fase se reinicia al cambiar de fase; el total no', () => {
    actualizar(2);
    irA('puncion');
    actualizar(1);
    expect(obtenerEstado().tiempoEnFase).toBe(1);
    expect(obtenerEstado().tiempoTotal).toBe(3);
  });

  it('avisa a los oyentes con la fase nueva y la anterior', () => {
    const avisos: string[] = [];
    const baja = alCambiarFase((nueva, anterior) => avisos.push(`${anterior}→${nueva}`));
    irA('puncion');
    baja();
    irA('guia');
    expect(avisos).toEqual(['exploracion→puncion']);
  });
});

describe('condiciones de las transiciones', () => {
  beforeEach(() => reiniciar());

  it('una condición bloquea la transición y explica por qué', async () => {
    const { fijarCondicion, motivoBloqueo } = await import('../src/core/estado');
    let listo = false;
    fijarCondicion('exploracion', 'puncion', () => (listo ? null : 'Falta algo'));
    expect(motivoBloqueo('puncion')).toBe('Falta algo');
    expect(irA('puncion')).toBe(false);
    listo = true;
    expect(irA('puncion')).toBe(true);
    fijarCondicion('exploracion', 'puncion', () => null);
  });
});

describe('terminar', () => {
  beforeEach(() => reiniciar());
  it('lleva a la evaluación desde cualquier fase', async () => {
    const { terminar } = await import('../src/core/estado');
    irA('puncion');
    terminar();
    expect(obtenerEstado().fase).toBe('evaluacion');
  });
});
