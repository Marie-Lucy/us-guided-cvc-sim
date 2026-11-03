// Paneles del HUD: lista del procedimiento, mentor, barra de herramientas y avisos.

import { PASOS, INFO_PASOS, type Paso, type Tarea, type Pista } from './guiaPasos';
import type { Fase } from '../config/fases';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Falta el elemento #${id} en index.html`);
  return e as T;
}

const S_POR_MIN = 60;
const PORCENTAJE = 100;
export const formatoTiempo = (s: number): string =>
  `${Math.floor(s / S_POR_MIN)}:${String(Math.floor(s % S_POR_MIN)).padStart(2, '0')}`;

const indice = (f: Fase): number => (f === 'evaluacion' ? PASOS.length : PASOS.indexOf(f));

// ---------------------------------------------------------------------
// Íconos de la barra (trazo, como en los otros simuladores)
// ---------------------------------------------------------------------
const ICONOS: Record<Paso, string> = {
  exploracion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="9" width="10" height="5" rx="1.5"/><path d="M9 9V5.5a3 3 0 0 1 6 0V9M12 2.5V1M6 17h12M8 20h8"/></svg>',
  puncion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l6-6M9 15l2 2M8 12l4 4 8-8-4-4-8 8zM14 6l4 4M18 2l4 4"/></svg>',
  guia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c4-2 6-6 8-10s4-7 7-7a3 3 0 0 1 0 6"/></svg>',
  dilatacion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l5-5M9 15l7-11 4 4-11 7zM16 4l4 4"/></svg>',
  cateter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c5-1 8-5 10-9l2-4M15 8l3-3M17 3l4 4M14 4l6 6"/></svg>',
};

// ---------------------------------------------------------------------
// Lista del procedimiento
// ---------------------------------------------------------------------
export function dibujarPasos(fase: Fase, tiempos: Partial<Record<Paso, number>>, tareasActuales: Tarea[]): void {
  const actual = indice(fase);
  el('progreso-pasos').textContent = `${Math.min(actual, PASOS.length)}/${PASOS.length}`;
  el('pasos').replaceChildren(...PASOS.map((p, i) => {
    const estado = i < actual ? 'done' : i === actual ? 'active' : 'locked';
    const fila = document.createElement('div');
    fila.className = `stage ${estado}`;
    const icono = estado === 'done' ? '✓' : estado === 'active' ? '●' : '○';
    const tiempo = tiempos[p];
    fila.innerHTML = `<div class="st-head"><span class="st-icon">${icono}</span><span class="st-num">${i + 1}</span>`
      + `<span></span><span class="st-time mono">${tiempo !== undefined ? formatoTiempo(tiempo) : ''}</span></div>`;
    fila.querySelector('.st-head span:nth-child(3)')!.textContent = INFO_PASOS[p].nombre;
    if (estado === 'active') {
      const lista = document.createElement('ul');
      lista.className = 'st-tasks';
      lista.append(...tareasActuales.map((t) => {
        const li = document.createElement('li');
        li.className = t.hecha ? 'ok' : '';
        li.textContent = `${t.hecha ? '✓' : '·'} ${t.texto}`;
        return li;
      }));
      fila.append(lista);
    }
    return fila;
  }));
}

// ---------------------------------------------------------------------
// Mentor
// ---------------------------------------------------------------------
export function prepararMentor(): void {
  const mentor = el('mentor');
  const boton = el('mentor-plegar');
  boton.addEventListener('click', () => {
    const plegado = mentor.classList.toggle('collapsed');
    boton.textContent = plegado ? '+' : '–';
    boton.setAttribute('aria-label', plegado ? 'Desplegar el mentor' : 'Plegar el mentor');
  });
}

let ultimoMentor = '';

export function dibujarMentor(paso: Paso, tareasActuales: Tarea[], p: Pista): void {
  // Solo se toca el DOM si algo cambió (se llama en cada cuadro)
  const clave = JSON.stringify([paso, tareasActuales, p]);
  if (clave === ultimoMentor) return;
  ultimoMentor = clave;
  const info = INFO_PASOS[paso];
  const hechas = tareasActuales.filter((t) => t.hecha).length;
  const pct = Math.round((hechas / tareasActuales.length) * PORCENTAJE);
  el('mentor-paso').textContent = `${PASOS.indexOf(paso) + 1}/${PASOS.length} · ${info.nombre}`;
  el('mentor-pct').textContent = `${pct}%`;
  el('mentor-barra').style.width = `${pct}%`;
  el('mentor-objetivo').textContent = info.objetivo;
  el('mentor-porque').textContent = info.porque;
  el('mentor-tareas').replaceChildren(...tareasActuales.map((t) => {
    const li = document.createElement('li');
    li.className = t.hecha ? 'ok' : '';
    const caja = document.createElement('span');
    caja.className = 'box';
    caja.textContent = t.hecha ? '✓' : '';
    li.append(caja, document.createTextNode(t.texto));
    return li;
  }));
  const pistaEl = el('mentor-pista');
  pistaEl.hidden = false;
  pistaEl.className = `mentor-hint ${p.tipo === 'info' ? '' : p.tipo}`;
  pistaEl.textContent = p.texto;
}

// ---------------------------------------------------------------------
// Barra de herramientas: un botón por paso, con su tecla numérica
// ---------------------------------------------------------------------
export interface BarraHerramientas {
  actualizar: (fase: Fase, motivo: (p: Paso) => string | null) => void;
}

export function crearBarra(alElegir: (p: Paso) => void): BarraHerramientas {
  const barra = el('barra-herramientas');
  const botones = PASOS.map((p, i) => {
    const b = document.createElement('button');
    b.className = 'tool-btn';
    b.dataset.paso = p;
    b.innerHTML = `<span class="key mono">${i + 1}</span>${ICONOS[p]}<span class="name"></span>`;
    b.querySelector('.name')!.textContent = INFO_PASOS[p].herramienta;
    b.addEventListener('click', () => alElegir(p));
    return b;
  });
  barra.replaceChildren(...botones);
  return {
    actualizar: (fase, motivo) => {
      const actual = indice(fase);
      botones.forEach((b, i) => {
        const p = PASOS[i];
        const esActual = p === fase;
        const bloqueo = esActual ? null : motivo(p);
        b.classList.toggle('active', esActual);
        b.classList.toggle('done', i < actual);
        b.disabled = !esActual && bloqueo !== null;
        b.title = bloqueo ?? INFO_PASOS[p].nombre;
      });
    },
  };
}

// ---------------------------------------------------------------------
// Avisos breves
// ---------------------------------------------------------------------
const DURACION_AVISO_MS = 4200;
const MAX_AVISOS = 3;

export function avisar(texto: string, tipo: 'info' | 'ok' | 'warn' | 'danger' = 'info'): void {
  const contenedor = el('avisos');
  const aviso = document.createElement('div');
  aviso.className = `toast ${tipo === 'info' ? '' : tipo}`;
  aviso.textContent = texto;
  contenedor.append(aviso);
  while (contenedor.children.length > MAX_AVISOS) contenedor.firstElementChild?.remove();
  requestAnimationFrame(() => aviso.classList.add('in'));
  setTimeout(() => {
    aviso.classList.remove('in');
    setTimeout(() => aviso.remove(), 300);
  }, DURACION_AVISO_MS);
}
