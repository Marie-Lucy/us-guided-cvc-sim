import { describe, it, expect } from 'vitest';
import {
  iniciarSeldinger, moverGuia, nivelEctopia, retirarAguja, motivoParaRetirarAguja, confirmarGuia, moverDilatador,
  moverCateter, retirarGuia, motivoParaDilatar, motivoParaCateter, motivoParaTerminar, motivoParaGuia,
  tramoEnVaso, instrumentoEnTrayecto, cateterEnObjetivo, type EstadoSeldinger,
} from '../src/procedimiento/seldinger';
import { voltajeEcg, esExtrasistole, DURACION_CICLO_S } from '../src/procedimiento/ecg';
import { estadoInicial, elegirEntrada, cambiarAngulo, moverAguja, actualizarFlash, type EstadoAguja } from '../src/aguja/aguja';
import { corteTransversal } from '../src/anatomia/anatomia';
import * as P from '../src/config/procedimiento';

const NIVEL = 25;
const corte = (z: number) => corteTransversal(z, 0);

// Aguja dentro del vaso pedido, con flash
function agujaEn(vaso: 'vena' | 'arteria'): EstadoAguja {
  const c = corte(NIVEL);
  const e = vaso === 'vena' ? c.vena : { cx: c.arteria.cx, cy: c.arteria.cy };
  const a = estadoInicial();
  cambiarAngulo(a, 45);
  elegirEntrada(a, e.cx, NIVEL + e.cy);
  while (a.lugar !== vaso && a.insertadaMm < 60) moverAguja(a, 0.2, corte);
  actualizarFlash(a, 1);
  return a;
}

// Recorre la técnica completa hasta antes de dilatar
function guiaListaParaDilatar(vaso: 'vena' | 'arteria'): EstadoSeldinger {
  const s = iniciarSeldinger(agujaEn(vaso));
  moverGuia(s, 150);
  retirarAguja(s);
  confirmarGuia(s, true);
  return s;
}

describe('pasar la guía', () => {
  it('sin flash no se pasa la guía', () => {
    const a = estadoInicial();
    expect(motivoParaGuia(a)).not.toBeNull();
    expect(motivoParaGuia(agujaEn('vena'))).toBeNull();
  });

  it('con la punta en la vena la guía avanza libre', () => {
    const s = iniciarSeldinger(agujaEn('vena'));
    expect(s.vaso).toBe('vena');
    moverGuia(s, 150);
    expect(s.guia.insertadaMm).toBe(150);
    expect(s.guia.resistencia).toBe(false);
  });

  it('con la punta fuera del vaso choca: resistencia', () => {
    const a = agujaEn('vena');
    a.lugar = 'tejido'; // la punta se salió
    const s = iniciarSeldinger(a);
    moverGuia(s, 50);
    expect(s.guia.insertadaMm).toBe(P.GUIA_MAX_SIN_VASO_MM);
    expect(s.guia.resistencia).toBe(true);
    expect(s.eventos).toContain('resistencia');
  });
});

describe('extrasístoles', () => {
  it('aparecen al pasar demasiada guía y ceden al retirarla', () => {
    const s = iniciarSeldinger(agujaEn('vena'));
    moverGuia(s, P.GUIA_ECTOPIA_MM - 10);
    expect(nivelEctopia(s)).toBe(0);
    moverGuia(s, 20);
    expect(nivelEctopia(s)).toBe(1);
    moverGuia(s, 80);
    expect(nivelEctopia(s)).toBe(2);
    moverGuia(s, -100);
    expect(nivelEctopia(s)).toBe(0);
    expect(s.eventos).toContain('ectopia');
  });

  it('la guía en la carótida no da extrasístoles (va hacia la aorta)', () => {
    const s = iniciarSeldinger(agujaEn('arteria'));
    moverGuia(s, 250);
    expect(nivelEctopia(s)).toBe(0);
  });

  it('un catéter demasiado profundo también da extrasístoles', () => {
    const s = guiaListaParaDilatar('vena');
    s.guia.retirada = true;
    moverCateter(s, P.CATETER_ECTOPIA_MM + 5);
    expect(nivelEctopia(s)).toBe(1);
  });
});

describe('ECG', () => {
  const sinusal = () => 0 as const;
  it('ritmo sinusal: todos los latidos iguales', () => {
    expect(voltajeEcg(0.22, sinusal)).toBeCloseTo(voltajeEcg(0.22 + DURACION_CICLO_S * 5, sinusal));
  });

  it('el pico R del latido normal es de ~1 mV', () => {
    expect(voltajeEcg(0.22, sinusal)).toBeGreaterThan(0.9);
  });

  it('una de cada 3 es extrasístole, y en el nivel grave una de cada 2', () => {
    expect([0, 1, 2, 3, 4, 5].map((k) => esExtrasistole(k, 1))).toEqual([false, false, true, false, false, true]);
    expect([0, 1, 2, 3].map((k) => esExtrasistole(k, 2))).toEqual([false, true, false, true]);
  });

  it('la extrasístole llega antes, sin onda P', () => {
    const ectopia = () => 1 as const;
    const inicio = 2 * DURACION_CICLO_S; // tercer latido
    // A los 0.08 s del ciclo: en la extrasístole ya está el QRS; en el normal, recién la P
    expect(voltajeEcg(inicio + 0.08, ectopia)).toBeGreaterThan(1);
    expect(voltajeEcg(0.08, sinusal)).toBeLessThan(0.2);
  });
});

describe('retirar la aguja y confirmar', () => {
  it('no se retira la aguja con poca guía adentro', () => {
    const s = iniciarSeldinger(agujaEn('vena'));
    moverGuia(s, 30);
    expect(motivoParaRetirarAguja(s)).not.toBeNull();
    expect(retirarAguja(s)).toBe(false);
  });

  it('con la aguja afuera la guía no se puede sacar del todo', () => {
    const s = iniciarSeldinger(agujaEn('vena'));
    moverGuia(s, 150);
    retirarAguja(s);
    moverGuia(s, -500);
    expect(s.guia.insertadaMm).toBeGreaterThan(0);
  });

  it('confirmar solo vale si la guía se ve', () => {
    const s = iniciarSeldinger(agujaEn('vena'));
    expect(confirmarGuia(s, false)).not.toBeNull();
    expect(s.guia.confirmada).toBe(false);
    expect(confirmarGuia(s, true)).toBeNull();
  });

  it('para dilatar: aguja afuera, guía confirmada y sin extrasístoles', () => {
    const s = iniciarSeldinger(agujaEn('vena'));
    moverGuia(s, 200);
    expect(motivoParaDilatar(s)).toMatch(/retira la aguja/);
    retirarAguja(s);
    expect(motivoParaDilatar(s)).toMatch(/Confirma/);
    confirmarGuia(s, true);
    expect(motivoParaDilatar(s)).toMatch(/extrasístoles/);
    moverGuia(s, -60);
    expect(motivoParaDilatar(s)).toBeNull();
  });
});

describe('dilatar y pasar el catéter', () => {
  it('dilatar hasta el vaso deja el trayecto listo; hay que retirar el dilatador', () => {
    const s = guiaListaParaDilatar('vena');
    moverDilatador(s, s.trayectoMm - 1);
    expect(motivoParaCateter(s)).toMatch(/Dilata/);
    moverDilatador(s, 2);
    expect(motivoParaCateter(s)).toMatch(/Retira el dilatador/);
    moverDilatador(s, -100);
    expect(motivoParaCateter(s)).toBeNull();
    expect(s.eventos).toEqual([]);
  });

  it('dilatar con la guía en la carótida es una complicación grave', () => {
    const s = guiaListaParaDilatar('arteria');
    moverDilatador(s, s.trayectoMm + 1);
    expect(s.eventos).toContain('dilatacion_arterial');
  });

  it('dilatar mucho más allá del vaso queda registrado', () => {
    const s = guiaListaParaDilatar('vena');
    moverDilatador(s, s.trayectoMm + P.DILATADOR_EXCESO_MM + 5);
    expect(s.eventos).toContain('dilatador_profundo');
  });

  it('catéter: retirar la guía exige catéter adentro; objetivo 12–16 cm', () => {
    const s = guiaListaParaDilatar('vena');
    moverCateter(s, 50);
    expect(retirarGuia(s)).toBe(false);
    moverCateter(s, 90);
    expect(cateterEnObjetivo(s)).toBe(true);
    expect(motivoParaTerminar(s)).toMatch(/Retira la guía/);
    expect(retirarGuia(s)).toBe(true);
    expect(motivoParaTerminar(s)).toBeNull();
    expect(s.eventos).not.toContain('cateter_profundo');
  });
});

describe('dónde se dibujan los dispositivos', () => {
  it('la guía ocupa el vaso desde la entrada hacia la clavícula', () => {
    const s = iniciarSeldinger(agujaEn('vena'));
    moverGuia(s, 100);
    const tramo = tramoEnVaso(s)!;
    expect(tramo.hastaZ).toBeCloseTo(s.zEntradaVaso);
    expect(tramo.desdeZ).toBeCloseTo(s.zEntradaVaso - 100);
    expect(tramo.radio).toBe(P.RADIO_GUIA_MM);
  });

  it('el trayecto lo ocupa la guía, luego el dilatador y luego el catéter', () => {
    const s = guiaListaParaDilatar('vena');
    expect(instrumentoEnTrayecto(s)!.tipo).toBe('guia');
    moverDilatador(s, 10);
    expect(instrumentoEnTrayecto(s)!.tipo).toBe('dilatador');
    moverDilatador(s, -10);
    moverCateter(s, 40);
    expect(instrumentoEnTrayecto(s)!.tipo).toBe('cateter');
    expect(tramoEnVaso(s)!.radio).toBe(P.RADIO_CATETER_MM);
  });
});

describe('textos de los controles', () => {
  it('cambian con la fase y avisan de la resistencia', async () => {
    const { textosSeldinger } = await import('../src/ui/textosSeldinger');
    const a = agujaEn('vena');
    a.lugar = 'tejido';
    const s = iniciarSeldinger(a);
    moverGuia(s, 20);
    const t = textosSeldinger('guia', s)!;
    expect(t.mas).toMatch(/guía/);
    expect(t.lectura).toMatch(/resistencia/);
    expect(t.accionBloqueada).not.toBeNull();
    expect(textosSeldinger('dilatacion', s)!.mas).toMatch(/dilatador/);
    expect(textosSeldinger('puncion', s)).toBeNull();
  });
});
