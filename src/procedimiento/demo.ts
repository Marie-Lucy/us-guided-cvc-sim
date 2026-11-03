// Demostración: un piloto automático que hace el procedimiento completo, narrando
// cada paso. Usa las mismas acciones que el usuario (a través de DemoHost), así que
// lo que muestra es exactamente lo que el simulador permite hacer.
// Cualquier clic o tecla del usuario la detiene y le deja el control.

import type { Fase } from '../config/fases';
import { t, type Clave } from '../i18n';
import type { Sonda, Orientacion } from '../sonda/sonda';
import type { Corte } from '../anatomia/anatomia';
import type { EstadoAguja } from '../aguja/aguja';
import type { EstadoSeldinger } from './seldinger';
import * as D from '../config/demo';

// Lo que la demostración puede hacer: las mismas acciones que los controles.
export interface DemoHost {
  fase: () => Fase;
  irA: (f: Fase) => boolean;
  sonda: () => Readonly<Sonda>;
  moverSonda: (posicionMm: number, lateralMm: number) => void;
  fijarCompresion: (valor: number) => void;
  orientar: (o: Orientacion) => void;
  doppler: (encendido: boolean) => void;
  etiquetas: (visibles: boolean) => void;
  corte: (z: number) => Corte; // anatomía a esa altura, con la sonda en lateral 0
  aguja: () => EstadoAguja;
  elegirEntrada: (x: number, z: number) => void;
  cambiarAngulo: (grados: number) => void;
  moverAguja: (mm: number) => void;
  seldinger: () => EstadoSeldinger | null;
  moverGuia: (mm: number) => void;
  retirarAguja: () => void;
  confirmarGuia: () => string | null;
  moverDilatador: (mm: number) => void;
  moverCateter: (mm: number) => void;
  retirarGuia: () => void;
}

interface PasoDemo {
  dice: Clave; // narración que muestra el mentor (clave del diccionario)
  empezar?: (h: DemoHost) => void;
  manejar?: (h: DemoHost, t: number, dt: number) => void; // se llama en cada cuadro
  listo: (h: DemoHost, t: number) => boolean;
}

const TOLERANCIA_MM = 0.2;

// Mueve un valor hacia el objetivo, como mucho 'paso' por cuadro
const acercar = (actual: number, objetivo: number, paso: number): number =>
  Math.abs(objetivo - actual) <= paso ? objetivo : actual + Math.sign(objetivo - actual) * paso;

// Centro de la vena a una altura, en el marco de la aguja (x medial)
const centroVena = (h: DemoHost, z: number): { x: number; y: number } => {
  const v = h.corte(z).vena;
  return { x: v.cx, y: v.cy };
};

function llevarSonda(posicion: (h: DemoHost) => number, lateral: (h: DemoHost) => number): Pick<PasoDemo, 'manejar' | 'listo'> {
  return {
    manejar: (h, _t, dt) => {
      const s = h.sonda();
      const paso = D.DEMO_VELOCIDAD_SONDA_MM_S * dt;
      h.moverSonda(acercar(s.posicionMm, posicion(h), paso), acercar(s.lateralMm, lateral(h), paso));
    },
    listo: (h) => {
      const s = h.sonda();
      return Math.abs(s.posicionMm - posicion(h)) < TOLERANCIA_MM && Math.abs(s.lateralMm - lateral(h)) < TOLERANCIA_MM;
    },
  };
}

const pausa = (segundos: number) => (_h: DemoHost, t: number): boolean => t >= segundos;

export const PASOS_DEMO: readonly PasoDemo[] = [
  {
    dice: 'demo.intro',
    empezar: (h) => h.etiquetas(true),
    listo: pausa(D.DEMO_PAUSA_LARGA_S),
  },
  {
    dice: 'demo.sonda',
    ...llevarSonda(() => D.DEMO_POSICION_SONDA_MM, () => 0),
  },
  {
    dice: 'demo.vasos',
    listo: pausa(D.DEMO_PAUSA_LARGA_S),
  },
  {
    dice: 'demo.comprimir',
    manejar: (h, t) => h.fijarCompresion(Math.min(t / D.DEMO_SUBIDA_COMPRESION_S, 1)),
    listo: pausa(D.DEMO_SUBIDA_COMPRESION_S + D.DEMO_PAUSA_CORTA_S),
  },
  {
    dice: 'demo.soltar',
    empezar: (h) => h.fijarCompresion(0),
    listo: pausa(D.DEMO_PAUSA_CORTA_S),
  },
  {
    dice: 'demo.doppler',
    empezar: (h) => h.doppler(true),
    listo: pausa(D.DEMO_PAUSA_LARGA_S),
  },
  {
    dice: 'demo.centrar',
    empezar: (h) => {
      h.doppler(false);
      h.etiquetas(false);
    },
    ...llevarSonda(() => D.DEMO_POSICION_SONDA_MM, (h) => centroVena(h, D.DEMO_POSICION_SONDA_MM).x),
  },
  {
    dice: 'demo.entrada',
    empezar: (h) => {
      h.irA('puncion');
      h.cambiarAngulo(D.DEMO_ANGULO_AGUJA_GRADOS);
      // A 45° se baja lo mismo que se avanza: entrando a esa distancia, la punta llega a la vena en el haz
      const v = centroVena(h, D.DEMO_POSICION_SONDA_MM);
      h.elegirEntrada(v.x, D.DEMO_POSICION_SONDA_MM + v.y);
    },
    listo: pausa(D.DEMO_PAUSA_CORTA_S),
  },
  {
    dice: 'demo.avanzar',
    manejar: (h, _t, dt) => h.moverAguja(D.DEMO_VELOCIDAD_AGUJA_MM_S * dt),
    listo: (h) => h.aguja().lugar === 'pared' || h.aguja().lugar === 'vena',
  },
  {
    dice: 'demo.tienda',
    manejar: (h, _t, dt) => h.moverAguja(D.DEMO_VELOCIDAD_AGUJA_LENTA_MM_S * dt),
    listo: (h) => h.aguja().lugar === 'vena',
  },
  {
    dice: 'demo.flash',
    listo: (h, t) => t >= D.DEMO_PAUSA_S && h.aguja().flash.cantidad > 0,
  },
  {
    dice: 'demo.guia',
    empezar: (h) => h.irA('guia'),
    manejar: (h, _t, dt) => h.moverGuia(Math.min(D.DEMO_VELOCIDAD_GUIA_MM_S * dt, D.DEMO_GUIA_MM - (h.seldinger()?.guia.insertadaMm ?? 0))),
    listo: (h) => (h.seldinger()?.guia.insertadaMm ?? 0) >= D.DEMO_GUIA_MM,
  },
  {
    dice: 'demo.retirarAguja',
    empezar: (h) => h.retirarAguja(),
    listo: pausa(D.DEMO_PAUSA_S),
  },
  {
    dice: 'demo.ejeLargo',
    empezar: (h) => h.orientar('longitudinal'),
    ...llevarSonda(() => D.DEMO_POSICION_EJE_LARGO_MM, (h) => centroVena(h, D.DEMO_POSICION_EJE_LARGO_MM).x),
  },
  {
    dice: 'demo.confirmada',
    empezar: (h) => { h.confirmarGuia(); },
    listo: pausa(D.DEMO_PAUSA_S),
  },
  {
    dice: 'demo.dilatar',
    empezar: (h) => {
      h.orientar('transversal');
      h.irA('dilatacion');
    },
    manejar: (h, _t, dt) => h.moverDilatador(D.DEMO_VELOCIDAD_DILATADOR_MM_S * dt),
    listo: (h) => {
      const s = h.seldinger();
      return !!s && s.dilatador.mm >= s.trayectoMm + D.DEMO_DILATADOR_EXTRA_MM;
    },
  },
  {
    dice: 'demo.retirarDilatador',
    manejar: (h, _t, dt) => h.moverDilatador(-D.DEMO_VELOCIDAD_DILATADOR_MM_S * dt),
    listo: (h) => (h.seldinger()?.dilatador.mm ?? 0) === 0,
  },
  {
    dice: 'demo.cateter',
    empezar: (h) => h.irA('cateter'),
    manejar: (h, _t, dt) => h.moverCateter(Math.min(D.DEMO_VELOCIDAD_CATETER_MM_S * dt, D.DEMO_CATETER_MM - (h.seldinger()?.cateter.mm ?? 0))),
    listo: (h) => (h.seldinger()?.cateter.mm ?? 0) >= D.DEMO_CATETER_MM,
  },
  {
    dice: 'demo.retirarGuia',
    empezar: (h) => h.retirarGuia(),
    listo: pausa(D.DEMO_PAUSA_S),
  },
  {
    dice: 'demo.fin',
    listo: pausa(D.DEMO_PAUSA_CORTA_S),
  },
];

// Ejecuta el guion: cada paso hace su 'empezar' una vez y luego 'manejar' en cada cuadro
// hasta que se cumple 'listo'.
export class Demo {
  indice = 0;
  terminada = false;
  private t = 0;
  private empezado = false;

  constructor(private readonly host: DemoHost, private readonly pasos: readonly PasoDemo[] = PASOS_DEMO) {}

  get narracion(): string {
    return t(this.pasos[Math.min(this.indice, this.pasos.length - 1)].dice);
  }

  get total(): number {
    return this.pasos.length;
  }

  actualizar(dt: number): void {
    if (this.terminada) return;
    const paso = this.pasos[this.indice];
    if (!this.empezado) {
      this.empezado = true;
      this.t = 0;
      paso.empezar?.(this.host);
    }
    if (paso.listo(this.host, this.t)) {
      this.indice++;
      this.empezado = false;
      if (this.indice >= this.pasos.length) this.terminada = true;
      return;
    }
    this.t += dt;
    paso.manejar?.(this.host, this.t, dt);
  }
}
