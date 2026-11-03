// Constantes de la aguja introductora y de la punción.
// Marco anatómico de la aguja (mm): x = medial (+) / lateral (−) respecto del
// centro de la sonda en lateral 0; y = profundidad desde la piel; z = altura
// sobre la clavícula (la misma "posición" que la sonda).

export const LARGO_AGUJA_MM = 64; // aguja 18 G de 6.35 cm
export const RADIO_AGUJA_MM = 0.64; // 18 G ≈ 1.27 mm de diámetro
export const ANGULO_MIN_GRADOS = 30;
export const ANGULO_MAX_GRADOS = 60;
export const ANGULO_INICIAL_GRADOS = 45;
export const ORIENTACION_MIN_GRADOS = -20; // − = hacia lateral
export const ORIENTACION_MAX_GRADOS = 20; // + = hacia medial
export const ORIENTACION_INICIAL_GRADOS = 0;
export const VELOCIDAD_AGUJA_MM_S = 5;
export const PASO_SIMULACION_MM = 0.2; // subdivisión del avance para no saltarse paredes
export const GRADOS_A_RAD = Math.PI / 180;

// Grosor del haz en elevación: la aguja se ve si cruza esta "lámina"
export const MITAD_GROSOR_HAZ_MM = 0.75;

// Tienda (tenting): cuánto se hunde la pared antes de perforarse
export const TIENDA_MAXIMA_VENA_MM = 4;
export const TIENDA_MAXIMA_ARTERIA_MM = 2;
export const ANCHO_TIENDA_MM = 3;
// Un trombo que llena al menos esta fracción de la vena sostiene la pared: casi no hay tienda
export const TROMBO_QUE_SOSTIENE_PARED = 0.5;
export const TIENDA_SOBRE_TROMBO_MM = 0.6;
export const ALCANCE_TIENDA_EN_HAZ_MM = 4; // la tienda se ve aunque la punta esté algo fuera del plano

// La compresión de la sonda solo afecta a los vasos cerca de la sonda
export const ALCANCE_COMPRESION_MM = 10;

// Jeringa: velocidad de llenado al aspirar con la punta en un vaso (fracción por segundo)
export const LLENADO_FLASH_POR_S = 0.6;
export const PULSATILIDAD_FLASH_ARTERIAL = 0.25;

// ---- Imagen de la aguja en la ecografía ----
export const BRILLO_AGUJA = 1.6; // la aguja es un reflector muy fuerte
export const COLA_AGUJA_REPETICIONES = 4; // reverberaciones ("cola de cometa")
export const GROSOR_LINEA_COLA_MM = 0.18;
export const COLA_AGUJA_SEPARACION_MM = 1.0;
export const COLA_AGUJA_DECAIMIENTO = 0.5;
export const SOMBRA_AGUJA = 0.35;

// ---- 3D ----
export const COLOR_AGUJA = '#d6dbe0';
export const COLOR_CONO = '#e9ecef';
export const COLOR_JERINGA = '#eef4fb';
export const COLOR_SANGRE_VENOSA = '#4a0b12';
export const COLOR_SANGRE_ARTERIAL = '#d4141e';
export const LARGO_JERINGA_MM = 62;
export const RADIO_JERINGA_MM = 7;
export const LARGO_CONO_MM = 14;
export const COLOR_MARCA_ENTRADA = '#ffd43b';
