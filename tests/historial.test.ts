import { describe, it, expect } from 'vitest';
import { leerHistorial, guardarIntento, mejorPuntaje, type Almacen, type Intento } from '../src/evaluacion/historial';
import { HISTORIAL_MAXIMO, CLAVE_HISTORIAL } from '../src/config/examen';

function almacenFalso(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => { datos.set(k, v); } };
}

const intento = (cambios: Partial<Intento> = {}): Intento => ({
  caso: 'normal', modo: 'examen', puntaje: 80, exito: true, calificacion: 'Bien', fecha: 1, ...cambios,
});

describe('historial de intentos', () => {
  it('guarda el más nuevo primero y recorta al máximo', () => {
    const a = almacenFalso();
    for (let i = 0; i < HISTORIAL_MAXIMO + 5; i++) guardarIntento(a, intento({ fecha: i }));
    const h = leerHistorial(a);
    expect(h.length).toBe(HISTORIAL_MAXIMO);
    expect(h[0].fecha).toBe(HISTORIAL_MAXIMO + 4);
  });

  it('sin almacenamiento no falla', () => {
    expect(leerHistorial(null)).toEqual([]);
    expect(guardarIntento(null, intento())).toHaveLength(1);
  });

  it('ignora datos dañados o con otra forma', () => {
    const a = almacenFalso();
    a.datos.set(CLAVE_HISTORIAL, '{no es json');
    expect(leerHistorial(a)).toEqual([]);
    a.datos.set(CLAVE_HISTORIAL, JSON.stringify([intento(), { caso: 'normal', puntaje: 'mucho' }]));
    expect(leerHistorial(a)).toHaveLength(1);
  });

  it('mejor puntaje por paciente y por modo', () => {
    const h = [intento({ puntaje: 60 }), intento({ puntaje: 90 }), intento({ puntaje: 100, modo: 'practica' }), intento({ caso: 'obeso', puntaje: 70 })];
    expect(mejorPuntaje(h, 'normal')).toBe(90);
    expect(mejorPuntaje(h, 'normal', 'practica')).toBe(100);
    expect(mejorPuntaje(h, 'variante')).toBeNull();
  });
});
