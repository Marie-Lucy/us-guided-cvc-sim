// Calidad adaptable: si los cuadros tardan mucho (celulares, equipos sin GPU),
// se baja la resolución de dibujo; si sobra tiempo, se vuelve a subir.

export const SUAVIZADO_TIEMPO_CUADRO = 0.1; // media exponencial del tiempo de cuadro
export const CUADROS_ENTRE_AJUSTES = 45;
export const MS_CUADRO_LENTO = 28; // < ~35 cuadros por segundo
export const MS_CUADRO_RAPIDO = 15; // > ~65 cuadros por segundo
export const FACTOR_BAJAR = 0.8;
export const FACTOR_SUBIR = 1.15;
export const ESCALA_MINIMA = 0.5;
export const ESCALA_MAXIMA = 1;
export const ESCALA_SIN_SOMBRAS = 0.75; // por debajo, se apagan las sombras del 3D
export const MS_CUADRO_IGNORADO = 250; // pestañas en segundo plano: no cuentan
