// Constantes de la vista 3D. 1 unidad = 1 mm.
// Ejes: x = hacia la derecha del paciente, y = hacia arriba (paciente en decúbito,
// cara anterior hacia arriba), z = a lo largo del cuello, hacia la cabeza.
// z = 0 es el borde superior de la clavícula, donde la sonda está a 0 mm.

// ---- Cuello ----
export const RADIO_CUELLO_MM = 52;
// Con la cabeza girada a la izquierda, el cuello rota y la cara derecha queda más arriba
export const ROTACION_CABEZA_RAD = 0.45;
// Ángulo alrededor del cuello (0 = línea media anterior, + hacia la derecha del paciente)
// donde queda el centro de la sonda; sube en oblicuo como el ECM.
export const ANGULO_SONDA_EN_CLAVICULA_RAD = 0.9;
export const INCLINACION_ECM_RAD_POR_MM = 0.003;
export const ANGULO_PIEL_MIN_RAD = -0.4;
export const ANGULO_PIEL_MAX_RAD = 2.8;
export const Z_PIEL_MIN_MM = -45;
export const Z_PIEL_MAX_MM = 112;
export const SEGMENTOS_ANGULO = 160;
export const SEGMENTOS_LARGO = 175;

// Relieves de la piel
export const ALTURA_ECM_MM = 4.5;
export const FACTOR_ANCHO_RELIEVE_ECM = 0.85; // fracción del semieje del ECM
export const Z_INSERCION_ECM_MM = -6; // abajo de esto el ECM se hunde en su inserción
export const ALTURA_CLAVICULA_MM = 6;
export const ANCHO_CLAVICULA_MM = 5;
export const Z_CLAVICULA_MEDIAL_MM = -9;
export const CAIDA_CLAVICULA_MM_POR_RAD = 4; // la clavícula baja un poco hacia el hombro
export const ANGULO_CLAVICULA_MAX_RAD = 2;
export const PROFUNDIDAD_HORQUILLA_MM = 5; // horquilla esternal
export const ANCHO_HORQUILLA_MM = 9;
export const ALTURA_LARINGE_MM = 5;
export const Z_LARINGE_MM = 78;
export const ANCHO_LARINGE_MM = 10;

// ---- Cuerpo bajo el campo (forma aproximada para que el campo estéril caiga encima) ----
export const ALTURA_TORAX_MM = 72;
export const SEMIANCHO_TORAX_MM = 190;
export const Z_INICIO_TORAX_MM = -14;
export const Z_TORAX_COMPLETO_MM = -55;
export const CENTRO_CABEZA = { x: -22, y: 18, z: 205 } as const; // cabeza girada a la izquierda
export const RADIO_CABEZA_MM = 92;
export const ALTURA_CAMA_MM = -62;
export const SUAVIDAD_UNIONES_MM = 18;

// ---- Campo estéril ----
export const CAMPO_ANCHO_MM = 620;
export const CAMPO_LARGO_MM = 680;
export const CAMPO_CENTRO_Z_MM = 60;
export const CAMPO_SEGMENTOS = 220;
export const CAMPO_TEXTURA_PX = 2048; // resolución del recorte de la ventana
export const CAMPO_SEPARACION_MM = 2.5; // por encima de la piel
export const VENTANA = { xMin: -22, xMax: 50, zMin: -24, zMax: 82, radio: 16 } as const;
export const PLIEGUES_AMPLITUD_MM = 5;
export const PLIEGUES_DISTANCIA_COMPLETA_MM = 90;
export const BORDE_ADHESIVO_MM = 6;

// ---- Sonda ----
export const SONDA_HUELLA_LARGO_MM = 38;
export const SONDA_HUELLA_ANCHO_MM = 9;
export const SONDA_HUNDIMIENTO_MAX_MM = 4; // cuánto se hunde la piel con presión máxima
export const HOYUELO_CAIDA_MM = 7;

// ---- Cámara y luces ----
export const CAMARA_FOV = 40; // la escena ocupa toda la pantalla: se ve el cuerpo entero bajo el campo
export const CAMARA_POSICION = { x: 10, y: 380, z: 150 } as const; // a la cabecera, como el operador
export const CAMARA_OBJETIVO = { x: 16, y: 26, z: 26 } as const;

// ---- Colores ----
export const COLOR_PIEL = '#c98b62'; // con antiséptico (clorhexidina coloreada)
export const COLOR_CAMPO = '#5b8dbb'; // azul quirúrgico suave, a tono con el degradé de fondo
export const COLOR_ADHESIVO = '#d9dee4';
export const COLOR_CAMA = '#c9cfd6';
export const COLOR_SONDA_CUERPO = '#d8dde3';
export const COLOR_SONDA_CABEZAL = '#2b3038';
export const COLOR_MARCA_SONDA = '#7ee08a';
export const COLOR_GEL = '#cfe6ff';
