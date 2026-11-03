import { describe, it, expect } from 'vitest';
import { direccionAguja, puntoAguja, cruceConHaz, cruceConPlano } from '../src/aguja/geometria';
import {
  estadoInicial, elegirEntrada, moverAguja, cambiarAngulo, actualizarFlash, punta, type EstadoAguja, type Lugar,
} from '../src/aguja/aguja';
import { corteTransversal } from '../src/anatomia/anatomia';
import { MITAD_GROSOR_HAZ_MM, LARGO_AGUJA_MM } from '../src/config/aguja';

const NIVEL = 25; // altura de la sonda sobre la clavícula
const T = 0;
const normal = (z: number) => corteTransversal(z, T);
const comprimido = (z: number) => corteTransversal(z, T, { compresion: 1 });

// Avanza de a 0.5 mm y anota por qué lugares pasó la punta
function recorrer(a: EstadoAguja, hasta: number, corte = normal): Lugar[] {
  const lugares: Lugar[] = [];
  while (a.insertadaMm < hasta) {
    moverAguja(a, 0.5, corte);
    if (lugares[lugares.length - 1] !== a.lugar) lugares.push(a.lugar);
  }
  return lugares;
}

// Entrada para que, a 45°, la punta llegue al centro de un vaso justo en el plano de la sonda
function apuntarA(cx: number, cy: number): EstadoAguja {
  const a = estadoInicial();
  cambiarAngulo(a, 45);
  elegirEntrada(a, cx, NIVEL + cy); // a 45° se baja lo mismo que se avanza hacia la clavícula
  return a;
}

describe('geometría de la aguja', () => {
  it('la dirección es unitaria, baja y va hacia la clavícula', () => {
    const d = direccionAguja(45, 10);
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
    expect(d.y).toBeGreaterThan(0);
    expect(d.z).toBeLessThan(0);
    expect(d.x).toBeGreaterThan(0); // +10° = hacia medial
  });

  it('cruza el plano del haz donde dice la fórmula t = (nivel − e.z) / d.z', () => {
    const e = { x: 0, y: 0, z: 35 };
    const d = direccionAguja(45, 0);
    const cruce = cruceConHaz(e, d, 30, NIVEL, 0, MITAD_GROSOR_HAZ_MM)!;
    expect(cruce.t).toBeCloseTo(10 / Math.cos(Math.PI / 4));
    expect((cruce.a.y + cruce.b.y) / 2).toBeCloseTo(10, 1); // a 45° baja 10 mm en 10 mm
  });

  it('trampa fuera de plano: el punto brillante es el cuerpo y la punta está más honda', () => {
    const e = { x: 0, y: 0, z: 35 };
    const d = direccionAguja(45, 0);
    const insertada = 25;
    const cruce = cruceConHaz(e, d, insertada, NIVEL, 0, MITAD_GROSOR_HAZ_MM)!;
    const p = puntoAguja(e, d, insertada);
    expect(cruce.incluyePunta).toBe(false);
    expect(p.y - Math.max(cruce.a.y, cruce.b.y)).toBeGreaterThan(5);
  });

  it('con la punta dentro de la lámina del haz, el punto sí es la punta', () => {
    const e = { x: 0, y: 0, z: 35 };
    const d = direccionAguja(45, 0);
    const cruce = cruceConHaz(e, d, 10 / Math.cos(Math.PI / 4), NIVEL, 0, MITAD_GROSOR_HAZ_MM)!;
    expect(cruce.incluyePunta).toBe(true);
  });

  it('si la aguja todavía no llega al plano, no se ve', () => {
    const e = { x: 0, y: 0, z: 35 };
    expect(cruceConHaz(e, direccionAguja(45, 0), 5, NIVEL, 0, MITAD_GROSOR_HAZ_MM)).toBeNull();
  });

  it('las coordenadas de la imagen se corren con la sonda', () => {
    const e = { x: 3, y: 0, z: 35 };
    const d = direccionAguja(45, 0);
    const centro = cruceConHaz(e, d, 30, NIVEL, 0, MITAD_GROSOR_HAZ_MM)!;
    const corrida = cruceConHaz(e, d, 30, NIVEL, 5, MITAD_GROSOR_HAZ_MM)!;
    expect(corrida.a.x).toBeCloseTo(centro.a.x - 5);
  });
});

describe('eje largo', () => {
  it('con la aguja recta sobre la línea de la sonda, se ve entera (en plano)', () => {
    const e = { x: 2, y: 0, z: 40 };
    const d = direccionAguja(40, 0);
    const cruce = cruceConPlano(e, d, 30, { orientacion: 'longitudinal', nivel: 25, lateral: 2 }, MITAD_GROSOR_HAZ_MM)!;
    expect(cruce.incluyePunta).toBe(true);
    const largoVisible = Math.hypot(cruce.b.x - cruce.a.x, cruce.b.y - cruce.a.y);
    expect(largoVisible).toBeCloseTo(30);
    // En la imagen: x = z − nivel, así que la entrada (z = 40) queda 15 mm hacia la cabeza
    expect(cruce.a.x).toBeCloseTo(15);
  });

  it('desviada hacia medial, solo se ve el tramo que cruza el plano', () => {
    const e = { x: 0, y: 0, z: 40 };
    const d = direccionAguja(40, 15);
    const cruce = cruceConPlano(e, d, 40, { orientacion: 'longitudinal', nivel: 25, lateral: 0 }, MITAD_GROSOR_HAZ_MM)!;
    expect(cruce.incluyePunta).toBe(false);
  });
});

describe('punción de la vena', () => {
  const { vena } = normal(NIVEL);

  it('entra a la vena: primero empuja la pared (tienda) y después aparece el flash', () => {
    const a = apuntarA(vena.cx, vena.cy);
    const lugares = recorrer(a, vena.cy * Math.SQRT2);
    expect(lugares).toEqual(['tejido', 'pared', 'vena']);
    expect(a.eventos.map((e) => e.tipo)).toEqual(['flash_venoso']);
  });

  it('la tienda crece mientras la pared no cede', () => {
    const a = apuntarA(vena.cx, vena.cy);
    let maxima = 0;
    while (a.lugar !== 'vena' && a.insertadaMm < LARGO_AGUJA_MM) {
      moverAguja(a, 0.2, normal);
      if (a.tienda) maxima = Math.max(maxima, a.tienda.profundidadMm);
    }
    expect(maxima).toBeGreaterThan(2);
  });

  it('si sigue avanzando, atraviesa la pared posterior', () => {
    const a = apuntarA(vena.cx, vena.cy);
    recorrer(a, (vena.cy + vena.ry + 3) * Math.SQRT2);
    expect(a.eventos.map((e) => e.tipo)).toContain('pared_posterior');
  });

  it('con la vena comprimida la atraviesa entera sin flash', () => {
    const c = comprimido(NIVEL).vena;
    const a = apuntarA(c.cx, c.cy);
    recorrer(a, (c.cy + 4) * Math.SQRT2, comprimido);
    const tipos = a.eventos.map((e) => e.tipo);
    expect(tipos).toContain('pared_posterior');
    expect(tipos).not.toContain('flash_venoso');
  });

  it('retirando lentamente desde atrás de la vena, vuelve a entrar y da flash', () => {
    const a = apuntarA(vena.cx, vena.cy);
    recorrer(a, (vena.cy + vena.ry + 3) * Math.SQRT2);
    a.eventos = [];
    while (a.lugar !== 'vena' && a.insertadaMm > 0) moverAguja(a, -0.2, normal);
    expect(a.lugar).toBe('vena');
  });

  it('la jeringa se llena con sangre venosa mientras aspira dentro de la vena', () => {
    const a = apuntarA(vena.cx, vena.cy);
    recorrer(a, vena.cy * Math.SQRT2);
    actualizarFlash(a, 1);
    expect(a.flash.tipo).toBe('vena');
    expect(a.flash.cantidad).toBeGreaterThan(0.5);
  });
});

describe('complicaciones', () => {
  it('apuntando a la carótida: punción carotídea con flash arterial', () => {
    const { arteria } = normal(NIVEL);
    const a = apuntarA(arteria.cx, arteria.cy);
    recorrer(a, arteria.cy * Math.SQRT2);
    const tipos = a.eventos.map((e) => e.tipo);
    expect(tipos).toContain('puncion_carotida');
    expect(tipos).toContain('flash_arterial');
  });

  it('demasiado profundo junto a la clavícula: neumotórax', () => {
    const a = estadoInicial();
    cambiarAngulo(a, 60);
    elegirEntrada(a, -16, 10); // lateral a la vena, cerca de la clavícula
    recorrer(a, LARGO_AGUJA_MM);
    expect(a.eventos.map((e) => e.tipo)).toContain('neumotorax');
    expect(punta(a)!.y).toBeGreaterThan(normal(0).pleura.profundidadMm);
  });
});

describe('intentos', () => {
  it('cada pinchazo nuevo cuenta un intento y vacía la jeringa', () => {
    const { vena } = normal(NIVEL);
    const a = apuntarA(vena.cx, vena.cy);
    recorrer(a, vena.cy * Math.SQRT2);
    actualizarFlash(a, 1);
    moverAguja(a, -LARGO_AGUJA_MM, normal);
    expect(a.lugar).toBe('piel');
    moverAguja(a, 1, normal);
    expect(a.intentos).toBe(2);
    expect(a.flash.cantidad).toBe(0);
  });

  it('no se puede cambiar el ángulo con la aguja adentro', () => {
    const a = apuntarA(0, 10);
    moverAguja(a, 5, normal);
    cambiarAngulo(a, 30);
    expect(a.anguloGrados).toBe(45);
  });
});
