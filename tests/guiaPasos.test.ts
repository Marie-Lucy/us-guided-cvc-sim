import { describe, it, expect } from 'vitest';
import { PASOS, INFO_PASOS, tareas, pista, type EstadoProcedimiento } from '../src/ui/guiaPasos';
import { estadoInicial } from '../src/aguja/aguja';
import { registroNuevo } from '../src/evaluacion/registro';
import type { EstadoSeldinger } from '../src/procedimiento/seldinger';

const base = (): EstadoProcedimiento => ({ registro: registroNuevo(), aguja: estadoInicial(), seldinger: null });

function seldinger(cambios: Partial<EstadoSeldinger> = {}): EstadoSeldinger {
  return {
    vaso: 'vena', zEntradaVaso: 25, trayectoMm: 22,
    guia: { insertadaMm: 0, resistencia: false, confirmada: false, retirada: false },
    agujaRetirada: false, dilatador: { mm: 0, tractoDilatado: false }, cateter: { mm: 0 }, eventos: [],
    ...cambios,
  };
}

describe('pasos del procedimiento', () => {
  it('cada paso tiene sus textos', () => {
    for (const p of PASOS) {
      expect(INFO_PASOS[p].nombre.length).toBeGreaterThan(0);
      expect(INFO_PASOS[p].porque.length).toBeGreaterThan(20);
      expect(tareas(p, base()).length).toBeGreaterThan(0);
    }
  });

  it('las tareas se marcan con el estado real', () => {
    const e = base();
    expect(tareas('exploracion', e)[0].hecha).toBe(false);
    e.registro.comprimioVena = true;
    expect(tareas('exploracion', e)[0].hecha).toBe(true);
    e.seldinger = seldinger({ guia: { insertadaMm: 120, resistencia: false, confirmada: true, retirada: false }, agujaRetirada: true });
    expect(tareas('guia', e).map((t) => t.hecha)).toEqual([true, true, true]);
  });
});

describe('pista del mentor', () => {
  it('en la carótida, alerta de peligro', () => {
    const e = base();
    e.aguja.lugar = 'arteria';
    expect(pista('puncion', e, null).tipo).toBe('danger');
  });

  it('flash venoso: indica pasar la guía', () => {
    const e = base();
    e.aguja.lugar = 'vena';
    expect(pista('puncion', e, null)).toEqual({ tipo: 'ok', texto: expect.stringMatching(/guía/) });
  });

  it('resistencia de la guía: advertencia', () => {
    const e = base();
    e.seldinger = seldinger({ guia: { insertadaMm: 6, resistencia: true, confirmada: false, retirada: false } });
    expect(pista('guia', e, 'algo').tipo).toBe('warn');
  });

  it('sin bloqueos, indica la tarea pendiente o el paso siguiente', () => {
    const e = base();
    expect(pista('exploracion', e, null).texto).toMatch(/comprime/);
    e.registro.comprimioVena = true;
    e.registro.usoDoppler = true;
    expect(pista('exploracion', e, null)).toEqual({ tipo: 'ok', texto: 'Listo: pasa a aguja (2).' });
  });

  it('sin alertas, muestra por qué no se puede seguir', () => {
    expect(pista('exploracion', base(), 'Falta comprimir')).toEqual({ tipo: 'info', texto: 'Falta comprimir' });
  });
});
