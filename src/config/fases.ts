// Fases del procedimiento y transiciones permitidas.

export const FASES = ['exploracion', 'puncion', 'guia', 'dilatacion', 'cateter', 'evaluacion'] as const;
export type Fase = (typeof FASES)[number];

// Desde cada fase, a cuáles se puede pasar.
// Avance lineal; de punción se puede volver a exploración (retirar la aguja);
// desde evaluación se empieza una partida nueva.
export const TRANSICIONES: Readonly<Record<Fase, readonly Fase[]>> = {
  exploracion: ['puncion'],
  puncion: ['guia', 'exploracion'],
  guia: ['dilatacion', 'puncion'], // si la guía no pasa, se vuelve a la aguja
  dilatacion: ['cateter'],
  cateter: ['evaluacion'],
  evaluacion: ['exploracion'],
};

export const FASE_INICIAL: Fase = 'exploracion';
