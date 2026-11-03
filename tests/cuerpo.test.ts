import { describe, it, expect } from 'vitest';
import {
  sondaAPiel, pielASonda, uvAPiel, puntoPiel, ejesEnPiel, relieve, anguloCentro, alturaCuerpo, dentroVentana,
} from '../src/escena/cuerpo';
import { RADIO_CUELLO_MM, ANGULO_PIEL_MIN_RAD, ANGULO_PIEL_MAX_RAD, Z_PIEL_MAX_MM, ALTURA_CAMA_MM } from '../src/config/escena';
import { ANATOMIA_NORMAL, LATERAL_SONDA_MIN_MM, LATERAL_SONDA_MAX_MM, POSICION_SONDA_MAX_MM } from '../src/config/anatomia';

const punto = (a: number, z: number) => puntoPiel(a, z);
const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => a.x * b.x + a.y * b.y + a.z * b.z;

describe('mapa sonda ↔ piel', () => {
  it('ida y vuelta da la misma posición', () => {
    for (const [pos, lat] of [[0, 0], [25, -7], [60, 15]]) {
      const { angulo, z } = sondaAPiel(pos, lat);
      const vuelta = pielASonda(angulo, z);
      expect(vuelta.posicionMm).toBeCloseTo(pos);
      expect(vuelta.lateralMm).toBeCloseTo(lat);
    }
  });

  it('mover hacia medial acerca la sonda a la línea media', () => {
    expect(sondaAPiel(25, 10).angulo).toBeLessThan(sondaAPiel(25, 0).angulo);
  });

  it('todo el recorrido de la sonda cabe en la malla de piel', () => {
    for (const pos of [0, POSICION_SONDA_MAX_MM]) {
      for (const lat of [LATERAL_SONDA_MIN_MM, LATERAL_SONDA_MAX_MM]) {
        const { angulo, z } = sondaAPiel(pos, lat);
        expect(angulo).toBeGreaterThan(ANGULO_PIEL_MIN_RAD);
        expect(angulo).toBeLessThan(ANGULO_PIEL_MAX_RAD);
        expect(z).toBeLessThan(Z_PIEL_MAX_MM);
      }
    }
  });

  it('las coordenadas de textura recorren toda la malla', () => {
    expect(uvAPiel(0, 0).angulo).toBe(ANGULO_PIEL_MIN_RAD);
    expect(uvAPiel(1, 1).z).toBe(Z_PIEL_MAX_MM);
  });
});

describe('superficie del cuello', () => {
  it('los haces del ECM sobresalen justo donde la ecografía los pone', () => {
    const z = 0; // junto a la clavícula los haces están separados
    const sep = ANATOMIA_NORMAL.bajo.ecmSeparacion;
    const sobreHaz = relieve(anguloCentro(z) - sep / RADIO_CUELLO_MM, z);
    const entreHaces = relieve(anguloCentro(z), z);
    expect(sobreHaz).toBeGreaterThan(entreHaces + 1); // el triángulo queda hundido
  });

  it('la clavícula sobresale bajo la sonda en posición 0', () => {
    expect(relieve(1, -13)).toBeGreaterThan(relieve(1, 20));
  });

  it('la tela sobre el cuello queda a la altura de la piel, relieves incluidos', () => {
    for (const z of [0, 30, 60]) {
      for (const a of [0.6, 0.9, 1.2, 1.5]) {
        const p = puntoPiel(a, z);
        expect(alturaCuerpo(p.x, z)).toBeGreaterThanOrEqual(p.y - 0.5);
      }
    }
  });

  it('el giro de la cabeza deja la zona de punción más arriba', () => {
    const p = puntoPiel(anguloCentro(20), 20);
    expect(p.y).toBeGreaterThan(p.x);
  });

  it('la normal apunta hacia afuera del cuello y es perpendicular a los otros ejes', () => {
    const { punto: p, normal, largo, cuello } = ejesEnPiel(anguloCentro(25), 25);
    const radial = { x: p.x, y: p.y, z: 0 };
    expect(dot(normal, radial)).toBeGreaterThan(0);
    expect(Math.abs(dot(normal, largo))).toBeLessThan(1e-6);
    expect(Math.abs(dot(normal, cuello))).toBeLessThan(0.05);
  });

  it('hundir la piel la acerca al eje del cuello', () => {
    const a = anguloCentro(20);
    const r = (q: ReturnType<typeof punto>) => Math.hypot(q.x, q.y);
    expect(r(puntoPiel(a, 20, 3))).toBeCloseTo(r(punto(a, 20)) - 3);
  });
});

describe('cuerpo bajo el campo', () => {
  it('nunca baja de la cama y el tórax sobresale del cuello', () => {
    expect(alturaCuerpo(400, 0)).toBeGreaterThanOrEqual(ALTURA_CAMA_MM);
    expect(alturaCuerpo(0, -120)).toBeGreaterThan(alturaCuerpo(0, 40));
  });

  it('la ventana deja ver la zona de punción', () => {
    const { angulo, z } = sondaAPiel(25, 0);
    const p = puntoPiel(angulo, z);
    expect(dentroVentana(p.x, p.z)).toBe(true);
    expect(dentroVentana(-150, 200)).toBe(false);
  });
});

describe('marco de la aguja → mundo', () => {
  it('profundidad 0 es la piel y más profundidad se acerca al eje del cuello', async () => {
    const { anatomicoAMundo } = await import('../src/escena/cuerpo');
    const enPiel = anatomicoAMundo({ x: 0, y: 0, z: 30 });
    const { angulo, z } = sondaAPiel(30, 0);
    const p = puntoPiel(angulo, z);
    expect(enPiel.x).toBeCloseTo(p.x);
    expect(enPiel.y).toBeCloseTo(p.y);
    // 15 mm bajo la piel, siguiendo la normal (que sobre el ECM no apunta justo al eje)
    const hondo = anatomicoAMundo({ x: 0, y: 15, z: 30 });
    expect(Math.hypot(hondo.x - enPiel.x, hondo.y - enPiel.y, hondo.z - enPiel.z)).toBeCloseTo(15);
    expect(Math.hypot(hondo.x, hondo.y)).toBeLessThan(Math.hypot(p.x, p.y) - 14);
  });
});
