// Constantes de la técnica de Seldinger.
// Las longitudes de la guía y del catéter se miden como en la clínica.

// ---- Guía metálica (J) ----
export const GUIA_LARGO_TOTAL_MM = 600;
export const GUIA_MAX_INSERTADA_MM = 300; // más allá de la punta de la aguja
export const GUIA_MAX_SIN_VASO_MM = 6; // con la punta fuera del vaso choca enseguida (resistencia)
export const GUIA_MIN_PARA_RETIRAR_AGUJA_MM = 100; // dejar suficiente guía adentro antes de sacar la aguja
export const VELOCIDAD_GUIA_MM_S = 40; // la guía se avanza mucho más rápido que la aguja
// Desde la yugular derecha, la unión cavo-auricular queda a unos 15–17 cm de la piel.
// Pasado ese punto la guía irrita el corazón: extrasístoles.
export const GUIA_ECTOPIA_MM = 170; // más allá de la punta de la aguja
export const GUIA_ECTOPIA_GRAVE_MM = 220;
export const RADIO_GUIA_MM = 0.45; // guía 0.035"

// ---- Dilatador ----
export const DILATADOR_MAX_MM = 70;
export const DILATADOR_EXCESO_MM = 15; // más allá del vaso, riesgo de desgarro
export const VELOCIDAD_DILATADOR_MM_S = 6;
export const RADIO_DILATADOR_MM = 1.7;

// ---- Catéter ----
export const CATETER_MAX_MM = 200;
export const CATETER_OBJETIVO_MIN_MM = 120; // profundidad desde la piel (yugular derecha)
export const CATETER_OBJETIVO_MAX_MM = 160;
export const CATETER_ECTOPIA_MM = 175;
export const CATETER_MIN_PARA_RETIRAR_GUIA_MM = 100;
export const VELOCIDAD_CATETER_MM_S = 20;
export const RADIO_CATETER_MM = 1.2;

// Dentro del vaso, la guía y el catéter van por la parte posterior de la luz
export const POSICION_EN_LUZ = 0.35; // fracción del radio vertical, hacia abajo

// ---- Imagen ----
export const BRILLO_GUIA = 1.3;
export const BRILLO_DILATADOR = 1.1;
export const BRILLO_CATETER = 1.0;

// ---- ECG ----
export const ECG_VENTANA_S = 4; // segundos visibles en la tira
export const ECG_PERIODO_EXTRASISTOLE = 3; // una de cada 3 latidos (trigeminismo)
export const ECG_PERIODO_EXTRASISTOLE_GRAVE = 2; // bigeminismo
export const ECG_COLOR_TRAZO = '#059669';
export const ECG_COLOR_ECTOPIA = '#d97706';
export const ECG_GROSOR_PX = 1.6;
export const ECG_ESCALA_MV = 0.38; // fracción del alto por mV

// ---- 3D ----
export const GUIA_VISIBLE_FUERA_MM = 220; // guía que sobresale de la piel
export const DILATADOR_LARGO_TOTAL_MM = 110;
export const CATETER_VISIBLE_FUERA_MAX_MM = 70;
export const COLOR_GUIA_3D = '#cfd6dd';
export const COLOR_DILATADOR_3D = '#3b82c4';
export const COLOR_CATETER_3D = '#f1f5f9';
export const COLOR_CONECTOR_CATETER_3D = '#2563eb';

// Grosor de la pared brillante de los instrumentos huecos (dilatador, catéter) en la imagen
export const PARED_HUECO_MM = 0.22;
