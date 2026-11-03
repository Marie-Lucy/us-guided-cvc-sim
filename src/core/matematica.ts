// Herramientas matemáticas pequeñas que usan varios módulos.

export const limitar = (x: number, min: number, max: number): number => Math.min(Math.max(x, min), max);

// Interpolación lineal entre a y b.
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Curva en S (smoothstep): 0 antes de e0, 1 después de e1, sin escalones entre ambos.
export function suavizar(e0: number, e1: number, x: number): number {
  const t = limitar((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
