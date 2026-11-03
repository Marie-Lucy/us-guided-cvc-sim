// Puntaje de la evaluación (sobre 100).

export const PUNTAJE_MAXIMO = 100;
export const DESCUENTO_POR_INTENTO_EXTRA = 10;
export const TIEMPO_SIN_DESCUENTO_S = 300; // 5 minutos
export const SEGUNDOS_POR_PUNTO = 30; // pasado ese tiempo, 1 punto cada 30 s
export const DESCUENTO_TIEMPO_MAXIMO = 15;
export const DESCUENTO_GRAVE = 40;
export const DESCUENTO_MODERADA = 20;
export const DESCUENTO_LEVE = 10;
export const PUNTAJE_MAXIMO_SIN_EXITO = 40; // si el catéter no quedó en la vena
export const UMBRAL_EXCELENTE = 90;
export const UMBRAL_BUENO = 70;
// Para dar por "comprobada" la compresibilidad: la vena tiene que haberse aplastado
export const APERTURA_VENA_COMPRIMIDA = 0.3;

// Prueba de compresión sobre un trombo: presión firme sobre un segmento ocupado
export const COMPRESION_PRUEBA = 0.6;
export const TROMBO_VISIBLE = 0.5;

// Si se agota el tiempo del examen, el tope sin éxito se reparte según los pasos completados
export const PASOS_PROCEDIMIENTO = 5;
