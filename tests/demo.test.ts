import { t } from '../src/i18n';
import { describe, it, expect, beforeEach } from 'vitest';
import { Demo, PASOS_DEMO, type DemoHost } from '../src/procedimiento/demo';
import { obtenerEstado, irA, reiniciar, actualizar, fijarCondicion } from '../src/core/estado';
import { obtenerSonda, moverSonda, fijarCompresion, rotarSonda, reiniciarSonda } from '../src/sonda/sonda';
import { corteTransversal } from '../src/anatomia/anatomia';
import {
  estadoInicial, elegirEntrada, moverAguja, actualizarFlash, reevaluar, type EstadoAguja,
} from '../src/aguja/aguja';
import {
  iniciarSeldinger, moverGuia, retirarAguja, confirmarGuia, moverDilatador, moverCateter, retirarGuia, tramoEnVaso,
  motivoParaGuia, motivoParaDilatar, motivoParaCateter, motivoParaTerminar, nivelEctopia, type EstadoSeldinger,
} from '../src/procedimiento/seldinger';
import { dispositivoVisible } from '../src/ultrasonido/parametros';
import { evaluar } from '../src/evaluacion/evaluacion';
import { registroNuevo } from '../src/evaluacion/registro';
import { ALCANCE_COMPRESION_MM } from '../src/config/aguja';

const DT = 1 / 30;
const MAX_CUADROS = 30 * 600; // 10 minutos simulados como tope

// Un simulador sin pantalla: los mismos módulos y reglas que main.ts
function simulador() {
  let aguja: EstadoAguja = estadoInicial();
  let seldinger: EstadoSeldinger | null = null;
  const registro = registroNuevo();
  let maxEctopia = 0;
  const t = () => obtenerEstado().tiempoTotal;
  const cortePorAltura = (z: number) => {
    const s = obtenerSonda();
    return corteTransversal(z, t(), { compresion: s.compresion * Math.exp(-(((z - s.posicionMm) / ALCANCE_COMPRESION_MM) ** 2)) });
  };

  fijarCondicion('puncion', 'guia', () => motivoParaGuia(aguja));
  fijarCondicion('guia', 'dilatacion', () => (seldinger ? motivoParaDilatar(seldinger) : 'sin guía'));
  fijarCondicion('dilatacion', 'cateter', () => (seldinger ? motivoParaCateter(seldinger) : 'sin guía'));
  fijarCondicion('cateter', 'evaluacion', () => (seldinger ? motivoParaTerminar(seldinger) : 'sin catéter'));

  const host: DemoHost = {
    fase: () => obtenerEstado().fase,
    irA: (f) => {
      const desde = obtenerEstado().fase;
      const ok = irA(f);
      if (ok && f === 'guia' && desde === 'puncion') seldinger = iniciarSeldinger(aguja);
      return ok;
    },
    sonda: obtenerSonda,
    moverSonda,
    fijarCompresion,
    orientar: (o) => { if (obtenerSonda().orientacion !== o) rotarSonda(); },
    doppler: () => { registro.usoDoppler = true; },
    etiquetas: () => {},
    corte: (z) => corteTransversal(z, t()),
    aguja: () => aguja,
    elegirEntrada: (x, z) => elegirEntrada(aguja, x, z),
    cambiarAngulo: () => {},
    moverAguja: (mm) => moverAguja(aguja, mm, cortePorAltura),
    seldinger: () => seldinger,
    moverGuia: (mm) => seldinger && moverGuia(seldinger, mm),
    retirarAguja: () => { if (seldinger) retirarAguja(seldinger); },
    confirmarGuia: () => {
      if (!seldinger?.vaso) return 'sin guía';
      const s = obtenerSonda();
      const tramo = tramoEnVaso(seldinger);
      const disp = tramo ? { vaso: seldinger.vaso, ...tramo } : null;
      const plano = { orientacion: s.orientacion, nivel: s.posicionMm, lateral: s.lateralMm };
      const motivo = confirmarGuia(seldinger, dispositivoVisible(disp, plano, corteTransversal(s.posicionMm, t(), { lateralMm: s.lateralMm })));
      if (!motivo && s.orientacion === 'longitudinal') registro.confirmoEnEjeLargo = true;
      return motivo;
    },
    moverDilatador: (mm) => seldinger && moverDilatador(seldinger, mm),
    moverCateter: (mm) => seldinger && moverCateter(seldinger, mm),
    retirarGuia: () => { if (seldinger) retirarGuia(seldinger); },
  };

  // Un cuadro del simulador, como el loop de main.ts
  const cuadro = (demo: Demo): void => {
    actualizar(DT);
    demo.actualizar(DT);
    const s = obtenerSonda();
    if (corteTransversal(s.posicionMm, t(), { compresion: s.compresion }).aperturaVena < 0.3) registro.comprimioVena = true;
    if (obtenerEstado().fase === 'puncion' && aguja.entrada) {
      reevaluar(aguja, cortePorAltura);
      actualizarFlash(aguja, DT);
    }
    if (seldinger) maxEctopia = Math.max(maxEctopia, nivelEctopia(seldinger));
  };

  return {
    host, cuadro, registro,
    aguja: () => aguja, seldinger: () => seldinger, maxEctopia: () => maxEctopia,
    reiniciar: () => { aguja = estadoInicial(); seldinger = null; },
  };
}

describe('demostración', () => {
  beforeEach(() => {
    reiniciar();
    reiniciarSonda();
  });

  it('hace el procedimiento completo y termina en la evaluación', () => {
    const sim = simulador();
    const demo = new Demo(sim.host);
    let cuadros = 0;
    while (!demo.terminada && cuadros++ < MAX_CUADROS) sim.cuadro(demo);
    expect(demo.terminada).toBe(true);
    expect(demo.indice).toBe(PASOS_DEMO.length);

    // Lo deja listo para terminar; la evaluación sale perfecta
    expect(irA('evaluacion')).toBe(true);
    const r = evaluar({
      registro: sim.registro, intentos: sim.aguja().intentos, eventosAguja: sim.aguja().eventos.map((e) => e.tipo),
      seldinger: sim.seldinger(), tiempoS: obtenerEstado().tiempoTotal,
    });
    expect(r.complicaciones).toEqual([]);
    expect(r.exito).toBe(true);
    expect(r.intentos).toBe(1);
    expect(sim.registro.comprimioVena).toBe(true);
    expect(sim.registro.confirmoEnEjeLargo).toBe(true);
    expect(sim.maxEctopia()).toBe(0); // nunca lleva la guía al corazón
  });

  it('dura un tiempo razonable para seguirla (entre 1 y 4 minutos)', () => {
    const sim = simulador();
    const demo = new Demo(sim.host);
    let cuadros = 0;
    while (!demo.terminada && cuadros++ < MAX_CUADROS) sim.cuadro(demo);
    expect(obtenerEstado().tiempoTotal).toBeGreaterThan(60);
    expect(obtenerEstado().tiempoTotal).toBeLessThan(240);
  });

  it('cada paso tiene su narración', () => {
    for (const p of PASOS_DEMO) expect(t(p.dice).length).toBeGreaterThan(15);
  });
});
