// Tarjeta de evaluación final, con el mismo formato de "debrief" que los otros simuladores.

import type { Resultado, Gravedad } from '../evaluacion/evaluacion';
import type { Caso } from '../casos/casos';
import { formatoTiempo } from './hud';
import { t, tk } from '../i18n';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Falta el elemento #${id} en index.html`);
  return e as T;
}

type Clase = 'ok' | 'warn' | 'bad';
interface Item { clase: Clase; titulo: string; valor: string; texto: string }

const CLASE_GRAVEDAD: Record<Gravedad, Clase> = { grave: 'bad', moderada: 'warn', leve: 'warn' };

function item({ clase, titulo, valor, texto }: Item): HTMLElement {
  const li = document.createElement('li');
  li.className = `db-item ${clase}`;
  li.innerHTML = '<div class="db-item-head"><span class="db-dot"></span><span class="db-lbl"></span><span class="db-v mono"></span></div><p></p>';
  li.querySelector('.db-lbl')!.textContent = titulo;
  li.querySelector('.db-v')!.textContent = valor;
  li.querySelector('p')!.textContent = texto;
  return li;
}

function items(r: Resultado): Item[] {
  return [
    {
      clase: r.intentos <= 1 ? 'ok' : 'warn',
      titulo: t('eval.pinchazos'),
      valor: String(r.intentos),
      texto: t('eval.pinchazosTexto'),
    },
    {
      clase: 'ok',
      titulo: t('eval.tiempo'),
      valor: formatoTiempo(r.tiempoS),
      texto: t('eval.tiempoTexto'),
    },
    ...r.complicaciones.map((c) => ({ clase: CLASE_GRAVEDAD[c.gravedad], titulo: c.titulo, valor: tk(`gravedad.${c.gravedad}`), texto: c.explicacion })),
    ...r.aciertos.map((a) => ({ clase: 'ok' as const, titulo: t('eval.bien'), valor: '✓', texto: a })),
    ...r.consejos.map((c) => ({ clase: 'warn' as const, titulo: t('eval.proxima'), valor: '', texto: c })),
  ];
}

function veredicto(r: Resultado): 'good' | 'warn' | 'bad' {
  if (!r.exito) return 'bad';
  return r.complicaciones.length === 0 ? 'good' : 'warn';
}

// 'sorpresa': el paciente era sorpresa y recién ahora se revela cuál era
export function mostrarEvaluacion(r: Resultado, c: Caso, sorpresa = false, demostracion = false): void {
  el('puntaje').textContent = String(r.puntaje);
  const v = el('veredicto');
  v.textContent = r.calificacion;
  v.className = `db-verdict ${veredicto(r)}`;
  el('titulo-evaluacion').textContent = r.exito
    ? t(r.complicaciones.length ? 'eval.exitoComplicado' : 'eval.exitoLimpio')
    : t('eval.fallo');
  const datos = { nombre: c.nombre, nivel: c.dificultad };
  el('caso-evaluado').textContent = t(demostracion ? 'eval.casoDemo' : sorpresa ? 'eval.casoSorpresa' : 'eval.caso', datos);
  el('items-evaluacion').replaceChildren(...items(r).map(item));
  el('claves-caso').textContent = t('eval.claves', { claves: c.claves });
  el('evaluacion').hidden = false;
  el<HTMLButtonElement>('repetir-caso').focus({ preventScroll: true });
}

export function ocultarEvaluacion(): void {
  el('evaluacion').hidden = true;
}
