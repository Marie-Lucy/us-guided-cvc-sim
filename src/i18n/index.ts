// Idiomas de la interfaz: español, portugués e inglés, como en los otros simuladores.
// Los textos viven en diccionarios con las mismas claves; el español es la referencia.
// Puro salvo applyI18n (que recibe el nodo) y la preferencia guardada.

import es from './es';
import en from './en';
import pt from './pt';
import type { Diccionario, Clave } from './tipos';

export type { Clave } from './tipos';
export type Idioma = 'es' | 'pt' | 'en';

export interface InfoIdioma {
  readonly id: Idioma;
  readonly corto: string; // en los selectores
  readonly nombre: string; // en su propio idioma
  readonly locale: string; // BCP 47: números, fechas y <html lang>
}

// Español y portugués son los más hablados de Latinoamérica; inglés como referencia
export const IDIOMAS: readonly InfoIdioma[] = [
  { id: 'es', corto: 'ES', nombre: 'Español', locale: 'es-419' },
  { id: 'pt', corto: 'PT', nombre: 'Português', locale: 'pt-BR' },
  { id: 'en', corto: 'EN', nombre: 'English', locale: 'en-US' },
];

export const DICCIONARIOS: Readonly<Record<Idioma, Diccionario>> = { es, pt, en };

const CLAVE_IDIOMA = 'cvc-sim:idioma';
let actual: Idioma = 'es';
const oyentes = new Set<(i: Idioma) => void>();

export const idiomaActual = (): Idioma => actual;
export const infoIdioma = (i: Idioma = actual): InfoIdioma => IDIOMAS.find((x) => x.id === i)!;

type Parametros = Readonly<Record<string, string | number>>;

// Traduce una clave y reemplaza los {parámetros}
export function t(clave: Clave, p?: Parametros): string {
  let s: string = DICCIONARIOS[actual][clave] ?? es[clave] ?? clave;
  if (p) for (const [k, v] of Object.entries(p)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

// Para claves armadas en tiempo de ejecución (`paso.${p}.nombre`); si no existe, devuelve la clave
export function tk(clave: string, p?: Parametros): string {
  return t(clave as Clave, p);
}

export function existeClave(clave: string): clave is Clave {
  return clave in es;
}

const formatos = new Map<string, Intl.NumberFormat>();

// Número con decimales fijos según el idioma (portugués usa coma decimal)
export function fmt(x: number, decimales = 1): string {
  const id = `${actual}|${decimales}`;
  let f = formatos.get(id);
  if (!f) {
    f = new Intl.NumberFormat(infoIdioma().locale, {
      minimumFractionDigits: decimales, maximumFractionDigits: decimales, useGrouping: false,
    });
    formatos.set(id, f);
  }
  return f.format(x);
}

// Primer idioma disponible entre la preferencia guardada y los del navegador (si no, inglés)
export function detectarIdioma(guardado: string | null, navegador: readonly string[]): Idioma {
  for (const l of [guardado ?? '', ...navegador]) {
    const base = l.toLowerCase().split(/[-_]/)[0];
    if (base === 'es' || base === 'pt' || base === 'en') return base;
  }
  return 'en';
}

export function leerIdiomaGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_IDIOMA);
  } catch {
    return null;
  }
}

export function cambiarIdioma(i: Idioma, guardar = false): void {
  if (guardar) {
    try {
      localStorage.setItem(CLAVE_IDIOMA, i);
    } catch {
      // sin almacenamiento: la elección dura esta sesión
    }
  }
  if (i === actual) return;
  actual = i;
  oyentes.forEach((fn) => fn(i));
}

export function alCambiarIdioma(fn: (i: Idioma) => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

// Rellena el HTML estático: [data-i18n] → texto, [data-i18n-html] → HTML (solo textos
// propios del diccionario), [data-i18n-title] → title, [data-i18n-aria] → aria-label.
export function aplicarIdioma(raiz: ParentNode): void {
  raiz.querySelectorAll('[data-i18n]').forEach((e) => (e.textContent = tk(e.getAttribute('data-i18n')!)));
  raiz.querySelectorAll('[data-i18n-html]').forEach((e) => (e.innerHTML = tk(e.getAttribute('data-i18n-html')!)));
  raiz.querySelectorAll('[data-i18n-title]').forEach((e) => e.setAttribute('title', tk(e.getAttribute('data-i18n-title')!)));
  raiz.querySelectorAll('[data-i18n-aria]').forEach((e) => e.setAttribute('aria-label', tk(e.getAttribute('data-i18n-aria')!)));
}
