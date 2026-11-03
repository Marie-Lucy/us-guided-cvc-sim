// Constantes de la imagen de ultrasonido.
// Unidades: mm, dB y amplitudes relativas (1 = reflector muy fuerte).

// ---- Controles del equipo ----
export const PROFUNDIDAD_MIN_MM = 30;
export const PROFUNDIDAD_MAX_MM = 60;
export const PROFUNDIDAD_PASO_MM = 5;
export const PROFUNDIDAD_INICIAL_MM = 40;
export const GANANCIA_MIN_DB = -15;
export const GANANCIA_MAX_DB = 15;
export const GANANCIA_PASO_DB = 1;
export const GANANCIA_INICIAL_DB = 0;
export const FRECUENCIA_SONDA_MHZ = 10; // solo para mostrar en pantalla
export const FOCO_MM = 18; // zona focal, a la altura de los vasos
// Resolución máxima del render (más = más nítido pero más costoso en celulares)
export const MAX_RATIO_PIXELES_US = 1.5;

// ---- Speckle: suma coherente de dispersores ----
// Cada celda tiene un dispersor con posición y amplitud al azar (estables).
// El eco de cada pixel es la suma de las ondas de los dispersores cercanos,
// pesadas por la forma del haz (PSF). La interferencia produce el granulado.
export const LONGITUD_ONDA_MM = 0.154; // 1540 m/s ÷ 10 MHz
export const CELDA_DISPERSOR_X_MM = 0.36;
export const CELDA_DISPERSOR_Y_MM = 0.22;
export const VECINDAD_X_CELDAS = 3; // celdas que se suman a cada lado
export const VECINDAD_Y_CELDAS = 2;
export const SIGMA_LATERAL_FOCO_MM = 0.42; // el haz es más ancho que largo
export const DESENFOQUE_POR_MM = 0.015; // ensanchamiento lateral lejos del foco
export const SIGMA_AXIAL_MM = 0.15;
// Grosor del corte: al mover la sonda más que esto, el speckle cambia por completo
export const GROSOR_CORTE_MM = 1.5;
export const MEDIA_RAYLEIGH = 0.886; // media de |suma| normalizada (√π / 2)
// Imagen compuesta: el equipo promedia vistas con el haz inclinado a distintos
// ángulos; cada una tiene un speckle independiente y el promedio lo suaviza.
export const VISTAS_COMPUESTAS = 2;

// ---- Reflectividad de cada tejido ----
export const R_TEJIDO = 0.045; // tejido conectivo profundo
export const VARIACION_TEJIDO = 0.6; // heterogeneidad a gran escala
export const ESCALA_VARIACION_MM = 5;
// Planos fasciales profundos: estrías tenues casi horizontales
export const ESTRIAS_LARGO_MM = 9;
export const ESTRIAS_ALTO_MM = 0.7;
export const ESTRIAS_NITIDEZ = 5;
export const ESTRIAS_BRILLO = 1.6; // multiplica la reflectividad del tejido
// Deformación de septos y estrías para que no sean rectos
export const DEFORMACION_SEPTOS_MM = 0.25;
export const ESCALA_DEFORMACION_MM = 2.5;
export const R_GRASA = 0.018; // subcutáneo: hipoecoico…
export const R_SEPTOS_GRASA = 0.12; // …con septos finos y horizontales
export const SEPTOS_GRASA_X_MM = 4;
export const SEPTOS_GRASA_Y_MM = 0.45;
export const NITIDEZ_SEPTOS_GRASA = 7;
export const R_MUSCULO = 0.017; // músculo cortado de través: oscuro…
export const R_MOTAS_MUSCULO = 0.09; // …con motas brillantes cortas (perimisio)
export const MOTAS_MUSCULO_X_MM = 1.1;
export const MOTAS_MUSCULO_Y_MM = 0.3;
export const NITIDEZ_MOTAS_MUSCULO = 5;
export const R_TIROIDES = 0.14; // parénquima homogéneo y brillante
export const R_SANGRE = 0.0006; // casi anecoica

// ---- Interfaces brillantes ----
// Las paredes reflejan más donde son perpendiculares al haz (techo y piso del vaso)
export const EXPONENTE_ESPECULAR = 2;
export const FRACCION_DIFUSA_PARED = 0.3;
export const GROSOR_PARED_VENA_MM = 0.25;
export const BRILLO_PARED_VENA = 0.28;
export const GROSOR_PARED_ARTERIA_MM = 0.35;
export const BRILLO_PARED_ARTERIA = 0.45;
export const SEPARACION_INTIMA_ADVENTICIA_MM = 0.55; // doble línea arterial
export const GROSOR_FASCIA_MM = 0.25;
export const BRILLO_FASCIA = 0.16;
export const BRILLO_CAPSULA_TIROIDES = 0.18;
export const BRILLO_FASCIA_SUPERFICIAL = 0.2;

// ---- Pleura y pulmón ----
export const GROSOR_PLEURA_MM = 0.35;
export const BRILLO_PLEURA = 0.9;
export const NUMERO_LINEAS_A = 3; // reverberaciones a 2×, 3×, 4× la profundidad pleural
export const DECAIMIENTO_LINEAS_A = 0.45;
export const R_PULMON = 0.035;
export const ALCANCE_REVERBERACION_MM = 6;
export const DESLIZAMIENTO_PLEURAL_MM = 0.8; // "lung sliding" con la respiración

// ---- Atenuación y artefactos ----
export const ATENUACION_TEJIDO_DB_MM = 0.6; // ida y vuelta, a 10 MHz
export const ATENUACION_SANGRE_DB_MM = 0.05; // la sangre casi no atenúa → refuerzo posterior
export const COMPENSACION_PROFUNDIDAD_DB_MM = 0.38; // TGC automática del equipo
export const INTENSIDAD_SOMBRA_BORDE = 0.45; // sombras de refracción bajo los bordes laterales
export const ANCHO_SOMBRA_BORDE_MM = 0.35;
export const ALCANCE_SOMBRA_BORDE_MM = 12; // la sombra se desvanece con la profundidad
export const BRILLO_CAMPO_CERCANO = 0.25; // reverberación bajo la piel
export const ALCANCE_CAMPO_CERCANO_MM = 0.7;
export const RUIDO_ELECTRONICO = 0.0012;
export const CAIDA_BORDE_LATERAL = 0.35; // el haz pierde fuerza en los extremos de la sonda
export const ANCHO_CAIDA_BORDE_MM = 2;

// ---- Conversión a grises (compresión logarítmica) ----
export const PISO_DB = -57; // lo que está por debajo se ve negro
export const RANGO_DINAMICO_DB = 54;
export const GAMMA_GRISES = 1.25;

// ---- Pantalla del equipo ----
export const COLOR_FUERA_IMAGEN = '#000000';
export const COLOR_TEXTO_EQUIPO = '#b8c2cf';
export const COLOR_ETIQUETA = '#ffd43b';
export const FUENTE_EQUIPO = '11px ui-monospace, Menlo, monospace';
export const FUENTE_ETIQUETAS = '600 12px system-ui, sans-serif';
export const PASO_MARCA_CORTA_MM = 5;
export const PASO_MARCA_LARGA_MM = 10;
export const LARGO_MARCA_CORTA_PX = 4;
export const LARGO_MARCA_LARGA_PX = 8;
export const TAMANO_MARCADOR_FOCO_PX = 5;
export const RADIO_MARCADOR_ORIENTACION_PX = 4;
export const MARGEN_EQUIPO_PX = 8;
export const INTERLINEADO_EQUIPO_PX = 15;

// ---- Esquema plano (vista didáctica) ----
export const COLORES_PLANO = {
  tejido: '#6b5a4e',
  subcutaneo: '#c9a66b',
  musculo: '#a0413c',
  vena: '#3b5bdb',
  trombo: '#8a6a7c',
  arteria: '#e03131',
  tiroides: '#b5835a',
  pulmon: '#4a5562',
  pleura: '#f1f3f5',
  etiqueta: '#ffffff',
} as const;
export const GROSOR_PLEURA_PX = 2;
export const PASO_DIBUJO_PLEURA_MM = 1;

export const MM_POR_CM = 10;

// ---- Doppler color ----
// Ventana de color (como en el equipo, solo se colorea dentro del recuadro)
export const DOPPLER_SEMIANCHO_MM = 13;
export const DOPPLER_ARRIBA_MM = 4;
export const DOPPLER_ABAJO_MM = 30;
export const DOPPLER_BLOQUE_MM = 0.35; // el color se ve en bloques, no en speckle fino
export const DOPPLER_CUADROS_POR_S = 14; // el color "titila" a la frecuencia de cuadros del Doppler
// Velocidades relativas (1 = escala del equipo). Perfil parabólico: máxima al centro.
export const DOPPLER_VELOCIDAD_DIASTOLICA = 0.25; // fracción del pico sistólico
export const DOPPLER_VELOCIDAD_VENOSA = 0.45;
export const DOPPLER_UMBRAL = 0.06; // por debajo no se colorea
export const DOPPLER_ALIASING = 0.92; // por encima, el color "da la vuelta" (aliasing)
export const DOPPLER_VARIACION = 0.3; // ruido del estimador de velocidad
export const COLOR_DOPPLER_CAJA = '#9aa5b1';

// ---- Eje largo ----
// La anatomía cambia a lo largo de la huella: se muestrea en columnas y se pasa
// al shader como una textura (una fila por estructura).
export const MUESTRAS_EJE_LARGO = 128;
export const FILAS_EJE_LARGO = 7;

// ---- Trombo ----
// Un trombo reciente es hipoecoico pero no anecoico: se ve gris oscuro y heterogéneo
// donde debería verse la sangre negra.
export const R_TROMBO = 0.012;
export const VARIACION_TROMBO = 0.7;
export const ESCALA_VARIACION_TROMBO_MM = 1.6;
