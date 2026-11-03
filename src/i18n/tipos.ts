import type es from './es';

export type Clave = keyof typeof es;
// Cada idioma tiene exactamente las claves del español
export type Diccionario = Record<Clave, string>;
