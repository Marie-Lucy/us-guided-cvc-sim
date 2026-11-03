// Medidas anatómicas y fisiológicas. Todo en milímetros, segundos o por minuto.
//
// Sistema de coordenadas del corte transversal:
//   x: horizontal en la imagen, 0 = centro de la sonda.
//      Negativo = lateral (izquierda de la pantalla), positivo = medial.
//   y: profundidad desde la piel, hacia abajo.

// ---- Sonda ----
export const ANCHO_SONDA_MM = 38; // huella de una sonda lineal típica
export const POSICION_SONDA_MIN_MM = 0; // sobre la clavícula
export const POSICION_SONDA_MAX_MM = 60; // hacia el ángulo de la mandíbula
export const POSICION_SONDA_INICIAL_MM = 35; // empieza arriba: el usuario baja buscando el triángulo

// ---- Anatomía ----
// Valores del corte en un nivel del cuello.
export interface NivelAnatomico {
  venaX: number; venaY: number; venaRx: number; venaRy: number;
  arteriaX: number; arteriaY: number; arteriaR: number;
  ecmSeparacion: number; ecmY: number; ecmRx: number; ecmRy: number;
}

export interface ParametrosTiroides {
  x: number; y: number; rx: number; ry: number;
  apareceDesdeMm: number; completaDesdeMm: number;
  empiezaAFaltarMm: number; desapareceMm: number;
}

export interface ParametrosPleura {
  profundidadEnClaviculaMm: number;
  hundimientoPorMm: number; // mm de profundidad extra por cada mm que sube la sonda
  verticeX: number; // la cúpula queda debajo de la vena, lateral
  curvatura: number; // 1/mm: la pleura se curva hacia abajo lejos del vértice
}

// Lo que cambia de un paciente a otro además de la forma
export interface FisiologiaPaciente {
  presionVenosaMmHg: number;
  amplitudRespiratoriaVena: number;
  tiendaMaximaVenaMm: number; // una vena con poca presión se hunde más antes de perforarse
}

// Trombo en la yugular: ocupa la luz desde la pared posterior hacia arriba.
// 'ocupacion' es la fracción de la altura de la vena que llena (1 = oclusivo).
export interface ParametrosTrombo {
  desdeMm: number; // tramo del cuello (mm sobre la clavícula) donde está
  hastaMm: number;
  transicionMm: number; // los extremos del trombo se afinan en esta distancia
  ocupacion: number;
}

export interface Anatomia {
  grosorSubcutaneoMm: number;
  bajo: NivelAnatomico; // junto a la clavícula
  alto: NivelAnatomico; // parte superior del cuello
  tiroides: ParametrosTiroides;
  pleura: ParametrosPleura;
  fisiologia?: Partial<FisiologiaPaciente>; // lo que no se indique, usa los valores normales
  trombo?: ParametrosTrombo;
}

// Entre "bajo" y "alto" se interpola suavemente.
export const ANATOMIA_NORMAL: Readonly<Anatomia> = {
  grosorSubcutaneoMm: 3,
  bajo: {
    // Yugular interna: grande, lateral, en el triángulo entre los haces del ECM
    venaX: -5, venaY: 16.5, venaRx: 8, venaRy: 6,
    // Carótida común: medial y más profunda
    arteriaX: 7, arteriaY: 21, arteriaR: 3.5,
    // Esternocleidomastoideo: separado en dos haces
    ecmSeparacion: 11, ecmY: 6, ecmRx: 7, ecmRy: 2.6,
  },
  alto: {
    // Más arriba la vena se acerca a la arteria y se hace más pequeña
    venaX: -3, venaY: 15.5, venaRx: 6, venaRy: 4.5,
    arteriaX: 6.8, arteriaY: 19.5, arteriaR: 3.5,
    // ECM en un solo vientre que cubre los vasos
    ecmSeparacion: 0, ecmY: 6.5, ecmRx: 16, ecmRy: 3.2,
  },
  // Solo aparece en una franja de alturas; los lóbulos se afinan en los polos
  tiroides: {
    x: 17, y: 16, rx: 5, ry: 7,
    apareceDesdeMm: 3, completaDesdeMm: 12,
    empiezaAFaltarMm: 35, desapareceMm: 48,
  },
  // Cúpula pleural: superficial junto a la clavícula, se hunde al subir
  pleura: {
    profundidadEnClaviculaMm: 24,
    hundimientoPorMm: 1.5,
    verticeX: -6,
    curvatura: 0.02,
  },
};

// Por debajo de este factor la tiroides no se dibuja
export const TIROIDES_FACTOR_MINIMO = 0.2;

// ---- Fisiología ----
export const FRECUENCIA_CARDIACA_LPM = 75;
export const FRECUENCIA_RESPIRATORIA_RPM = 14;
export const S_POR_MIN = 60;
// Fracción del ciclo cardiaco que dura la subida sistólica
export const FRACCION_SISTOLE = 0.15;
// Constante de caída diastólica, como fracción del ciclo
export const TAU_DIASTOLE = 0.15;
// Cambio relativo del radio arterial en el pico sistólico (5–10 %)
export const AMPLITUD_PULSO_ARTERIAL = 0.07;
// Cambio relativo del radio vertical de la vena con la respiración
export const AMPLITUD_RESPIRATORIA_VENA = 0.12;
// La vena se deforma más en vertical que en horizontal
export const FRACCION_RESPIRATORIA_HORIZONTAL = 0.5;

// ---- Presiones (mmHg) y ley del tubo ----
// Un vaso colapsa cuando la presión de la sonda supera su presión interna.
// La misma regla explica que la yugular se aplaste y la carótida no.
export const PRESION_SONDA_MAX_MMHG = 40; // presión firme con la sonda
export const PRESION_VENOSA_MMHG = 6; // ≈ 8 cmH₂O
export const PRESION_ARTERIAL_DIASTOLICA_MMHG = 75; // la mínima del ciclo
export const AUMENTO_PRESION_VALSALVA_MMHG = 20;
// Rango de presión transmural en el que el vaso pasa de abierto a colapsado
export const RANGO_COLAPSO_MMHG = 12;
export const FRACCION_MINIMA_COLAPSO = 0.07; // la vena colapsada queda como una rendija
// Al aplastarse, la vena se ensancha un poco hacia los lados
export const ENSANCHAMIENTO_AL_COLAPSAR = 0.3;
// Cuánto se distiende la vena por cada mmHg de presión venosa extra (Valsalva)
export const DISTENSIBILIDAD_VENA_POR_MMHG = 0.013;
export const FRACCION_DISTENSION_HORIZONTAL = 0.4;
// La sonda hunde la piel; el tejido superficial se comprime más que el profundo
export const HUNDIMIENTO_TEJIDO_MAX_MM = 3;
export const ESCALA_HUNDIMIENTO_MM = 8;

// ---- Valsalva ----
export const VALSALVA_SUBIDA_S = 1;
export const VALSALVA_MESETA_S = 4;
export const VALSALVA_BAJADA_S = 1.2;

// ---- Movimiento de la sonda ----
export const LATERAL_SONDA_MIN_MM = -15; // hacia lateral (posterior)
export const LATERAL_SONDA_MAX_MM = 15; // hacia medial (tráquea)
export const PASO_TECLADO_MM = 1;
// Con la tecla de compresión: cuánto sube y baja la presión por segundo (fracción de la máxima)
export const VELOCIDAD_COMPRESION_POR_S = 1.5;
export const VELOCIDAD_LIBERACION_POR_S = 3;
