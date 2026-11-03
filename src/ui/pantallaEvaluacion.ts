// Tarjeta de evaluación final, con el mismo formato de "debrief" que los otros simuladores.

import type { Resultado, Gravedad } from '../evaluacion/evaluacion';
import type { Caso } from '../casos/casos';
import { formatoTiempo } from './hud';

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
      titulo: 'Pinchazos',
      valor: String(r.intentos),
      texto: 'Cada pinchazo suma riesgo. Alinea sonda y aguja antes de entrar y sigue la punta.',
    },
    {
      clase: 'ok',
      titulo: 'Tiempo',
      valor: formatoTiempo(r.tiempoS),
      texto: 'Sin apuro: la seguridad importa más que la velocidad. Descuenta pasados los 5 minutos.',
    },
    ...r.complicaciones.map((c) => ({ clase: CLASE_GRAVEDAD[c.gravedad], titulo: c.titulo, valor: c.gravedad, texto: c.explicacion })),
    ...r.aciertos.map((a) => ({ clase: 'ok' as const, titulo: 'Bien hecho', valor: '✓', texto: a })),
    ...r.consejos.map((c) => ({ clase: 'warn' as const, titulo: 'Para la próxima', valor: '', texto: c })),
  ];
}

function veredicto(r: Resultado): 'good' | 'warn' | 'bad' {
  if (!r.exito) return 'bad';
  return r.complicaciones.length === 0 ? 'good' : 'warn';
}

// 'sorpresa': el paciente era sorpresa y recién ahora se revela cuál era
export function mostrarEvaluacion(r: Resultado, c: Caso, sorpresa = false): void {
  el('puntaje').textContent = String(r.puntaje);
  const v = el('veredicto');
  v.textContent = r.calificacion;
  v.className = `db-verdict ${veredicto(r)}`;
  el('titulo-evaluacion').textContent = r.exito
    ? (r.complicaciones.length ? 'Catéter en la vena, con complicaciones para revisar.' : 'Catéter en la vena, sin complicaciones.')
    : 'El procedimiento no se completó de forma segura.';
  el('caso-evaluado').textContent = `${sorpresa ? 'Paciente sorpresa: era ' : ''}${c.nombre} · ${c.dificultad}`;
  el('items-evaluacion').replaceChildren(...items(r).map(item));
  el('claves-caso').textContent = `Claves de este paciente: ${c.claves}`;
  el('evaluacion').hidden = false;
  el<HTMLButtonElement>('repetir-caso').focus({ preventScroll: true });
}

export function ocultarEvaluacion(): void {
  el('evaluacion').hidden = true;
}
