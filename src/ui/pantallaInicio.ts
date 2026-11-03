// Pantalla de inicio con la portada común a los otros simuladores: logo, título,
// aviso educativo, qué vas a hacer, controles y elección de paciente.

import { CASOS, SORPRESA, type IdCaso, type EleccionCaso } from '../casos/casos';
import { mejorPuntaje, type Intento, type Modo } from '../evaluacion/historial';
import { TIEMPO_LIMITE_EXAMEN_S, HISTORIAL_VISIBLE } from '../config/examen';

const S_POR_MIN = 60;
const UMBRAL_BIEN = 70;

const CLAVE_NO_MOSTRAR = 'cvc-sim:no-mostrar-inicio';

const FLECHA = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11 11 5M6 5h5v5"/></svg>';

// Ilustración: corte transversal del cuello con la yugular, la carótida y la aguja
const ARTE = `
<svg class="ss-glow" viewBox="0 0 240 300" fill="none" aria-hidden="true">
  <defs>
    <radialGradient id="ssVena" cx="45%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.95"/><stop offset="100%" stop-color="#7dd3fc" stop-opacity="0.3"/>
    </radialGradient>
    <linearGradient id="ssAguja" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <filter id="ssBrillo" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>
  </defs>
  <path d="M30 60 C80 48 160 48 210 60" stroke="#7dd3fc" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
  <path d="M42 84 C80 70 160 70 198 84 C170 100 70 100 42 84 Z" stroke="#bae6fd" stroke-width="2" fill="#e0f2fe" fill-opacity="0.35"/>
  <ellipse cx="96" cy="150" rx="46" ry="32" fill="url(#ssVena)" stroke="#bae6fd" stroke-width="2.5"/>
  <circle cx="164" cy="186" r="22" fill="#ffe4e6" fill-opacity="0.55" stroke="#fda4af" stroke-width="3"/>
  <path d="M24 214 C70 196 170 196 216 214" stroke="#e0f2fe" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  <path d="M30 22 L92 142" stroke="url(#ssAguja)" stroke-width="5" stroke-linecap="round" filter="url(#ssBrillo)"/>
  <circle cx="94" cy="146" r="13" fill="none" stroke="#34d399" stroke-width="2.4" filter="url(#ssBrillo)"/>
  <path d="M84 156 h20 M86 162 h16 M88 168 h12" stroke="#ecfdf5" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
</svg>`;

const PASOS = [
  'Identificar la yugular y la carótida, y comprimir',
  'Puncionar siguiendo la punta hasta el flash',
  'Pasar la guía y confirmarla en la vena',
  'Dilatar el trayecto',
  'Colocar el catéter a 12–16 cm',
];

const CONTROLES: readonly [string, string][] = [
  ['Pasos', '1–5'],
  ['Mover la sonda', 'Arrastrar · flechas'],
  ['Comprimir', 'Espacio'],
  ['Girar la sonda', 'R'],
  ['Avanzar / retirar', 'W / S'],
  ['En el celular', 'Botones y deslizadores'],
];

const CLASE_DIFICULTAD: Record<string, string> = { Básico: 'basico', Intermedio: 'intermedio', Avanzado: 'avanzado' };

function leerNoMostrar(): boolean {
  try {
    return localStorage.getItem(CLAVE_NO_MOSTRAR) === '1';
  } catch {
    return false; // sin almacenamiento (modo privado): se muestra siempre
  }
}

function guardarNoMostrar(valor: boolean): void {
  try {
    if (valor) localStorage.setItem(CLAVE_NO_MOSTRAR, '1');
    else localStorage.removeItem(CLAVE_NO_MOSTRAR);
  } catch {
    // la preferencia no se recuerda, y no pasa nada
  }
}

export interface PantallaInicio { abrir: (casoActual: EleccionCaso, modo: Modo) => void }

const DESCRIPCION_SORPRESA = `Uno de los ${CASOS.length} pacientes, al azar. No sabrás cuál hasta la evaluación: explora antes de decidir.`;

const NOTA_MODO: Record<Modo, string> = {
  practica: 'Con mentor, pistas, Doppler, etiquetas y esquema. Sin límite de tiempo.',
  examen: `Sin ayudas y con ${TIEMPO_LIMITE_EXAMEN_S / S_POR_MIN} minutos. Tu mejor puntaje queda guardado en este navegador.`,
};

const claseIntento = (i: Intento): string => (!i.exito ? 'bad' : i.puntaje >= UMBRAL_BIEN ? 'good' : 'warn');

export function prepararInicio(
  alEmpezar: (caso: EleccionCaso, modo: Modo) => void, historial: () => readonly Intento[],
  alVerDemo: () => void,
): PantallaInicio {
  const capa = document.getElementById('inicio')!;
  capa.innerHTML = `
    <div class="ss-watermark" aria-hidden="true">ECO · CVC</div>
    <div class="ss-shell">
      <header class="ss-nav">
        <div class="ss-logo">
          <span class="ss-logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><ellipse cx="10" cy="13" rx="6" ry="4"/><circle cx="18.5" cy="15.5" r="2.5"/></svg></span>
          <span class="ss-logo-text">Eco CVC</span>
        </div>
        <span class="ss-nav-tag">Simulador educativo · Yugular interna derecha</span>
      </header>

      <section class="ss-hero">
        <div class="ss-col ss-copy">
          <span class="ss-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linejoin="round"/></svg>Ecografía en tiempo real</span>
          <h1 class="ss-title" id="titulo-inicio">Eco CVC</h1>
          <p class="ss-lead">Canaliza la yugular interna derecha con ecografía y técnica de Seldinger, sin puncionar la carótida, la pared posterior ni la pleura.</p>
          <p class="ss-chosen"><b class="ss-chosen-title"></b> <button class="ss-change" type="button">Cambiar ↓</button></p>
          <p class="ss-case"></p>
          <div class="ss-mode">
            <span class="ss-mode-lbl">Modo</span>
            <div class="ss-mode-toggle" role="radiogroup" aria-label="Modo">
              <button type="button" role="radio" data-modo="practica">Práctica</button>
              <button type="button" role="radio" data-modo="examen">Examen</button>
            </div>
          </div>
          <p class="ss-mode-note"></p>
          <div class="ss-cta">
            <button class="ss-pill ss-pill-dark ss-entrar">Entrar al simulador<span class="ss-arrow">${FLECHA}</span></button>
            <button class="ss-pill ss-pill-light ss-demo">Ver una demostración primero<span class="ss-arrow green">${FLECHA}</span></button>
          </div>
          <p class="ss-ack">Al entrar aceptas que es solo para educación.</p>
          <label class="ss-no-mostrar"><input type="checkbox" class="ss-check-no-mostrar"> No mostrar al abrir</label>
        </div>

        <div class="ss-col ss-center">
          <div class="ss-arch">
            <div class="ss-arch-bg"></div>
            <div class="ss-arch-art">${ARTE}</div>
            <div class="ss-float ss-float-top">
              <span class="ss-float-num">${CASOS.length}</span>
              <span class="ss-float-lbl">PACIENTES</span>
            </div>
            <div class="ss-float ss-float-bottom">
              <span class="ss-float-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
              <span><b>5 pasos</b><small>Técnica de Seldinger</small></span>
            </div>
          </div>
        </div>

        <div class="ss-col ss-right">
          <div class="ss-glass">
            <span class="ss-badge"><span class="ss-warn-dot"></span>Solo educación</span>
            <p class="ss-disclaimer">No es un dispositivo médico ni entrenamiento clínico certificado. La anatomía, la fisiología y los dispositivos están simplificados con fines didácticos.</p>
            <p class="ss-glass-title">Vas a</p>
            <ul class="ss-list">${PASOS.map((p) => `<li>${p}</li>`).join('')}</ul>
            <p class="ss-glass-title">Controles</p>
            <ul class="ss-facts small">${CONTROLES.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join('')}</ul>
          </div>
        </div>
      </section>

      <section class="ss-cases" id="ss-pacientes">
        <h2 class="ss-cases-title">Paciente</h2>
        <div class="ss-case-grid" role="radiogroup" aria-label="Paciente"></div>
      </section>

      <section class="ss-history">
        <h2 class="ss-cases-title">Tus intentos</h2>
        <ul class="ss-history-list"></ul>
      </section>
    </div>`;

  let elegido: EleccionCaso = CASOS[0].id;
  let modo: Modo = 'practica';
  const grilla = capa.querySelector<HTMLElement>('.ss-case-grid')!;
  const tarjetas = CASOS.map((c) => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'ss-case-card';
    t.setAttribute('role', 'radio');
    t.dataset.caso = c.id;
    t.innerHTML = `<div class="ss-case-head"><span class="ss-diff ${CLASE_DIFICULTAD[c.dificultad]}"></span></div><b></b><span class="ss-case-best"></span><span class="ss-case-variant"></span>`;
    t.querySelector('.ss-diff')!.textContent = c.dificultad;
    t.querySelector('b')!.textContent = c.nombre;
    t.querySelector('.ss-case-variant')!.textContent = c.descripcion;
    t.addEventListener('click', () => { elegido = c.id; marcar(); });
    return t;
  });
  // Tarjeta del paciente sorpresa
  const sorpresa = document.createElement('button');
  sorpresa.type = 'button';
  sorpresa.className = 'ss-case-card ss-case-sorpresa';
  sorpresa.setAttribute('role', 'radio');
  sorpresa.dataset.caso = SORPRESA;
  sorpresa.innerHTML = '<div class="ss-case-head"><span class="ss-diff sorpresa">?</span></div><b>Paciente sorpresa</b><span class="ss-case-best"></span><span class="ss-case-variant"></span>';
  sorpresa.querySelector('.ss-case-variant')!.textContent = DESCRIPCION_SORPRESA;
  sorpresa.addEventListener('click', () => { elegido = SORPRESA; marcar(); });
  tarjetas.push(sorpresa);
  grilla.replaceChildren(...tarjetas);

  const marcar = (): void => {
    for (const t of tarjetas) {
      const on = t.dataset.caso === elegido;
      t.classList.toggle('on', on);
      t.setAttribute('aria-checked', String(on));
    }
    const c = CASOS.find((x) => x.id === elegido);
    capa.querySelector('.ss-chosen-title')!.textContent = c?.nombre ?? 'Paciente sorpresa';
    // En el examen no se dan las claves del paciente: solo la descripción
    capa.querySelector('.ss-case')!.textContent = !c ? DESCRIPCION_SORPRESA
      : modo === 'examen' ? c.descripcion : `${c.descripcion} ${c.claves}`;
    for (const b of capa.querySelectorAll<HTMLButtonElement>('[data-modo]')) {
      const on = b.dataset.modo === modo;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
    capa.querySelector('.ss-mode-note')!.textContent = NOTA_MODO[modo];
    dibujarHistorial();
  };

  const fecha = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const dibujarHistorial = (): void => {
    const h = historial();
    for (const t of tarjetas) {
      if (t.dataset.caso === SORPRESA) continue;
      const mejor = mejorPuntaje(h, t.dataset.caso as IdCaso);
      t.querySelector('.ss-case-best')!.textContent = mejor === null ? '' : `Mejor examen: ${mejor}`;
    }
    const lista = capa.querySelector('.ss-history-list')!;
    if (!h.length) {
      const vacio = document.createElement('li');
      vacio.className = 'ss-attempt-empty';
      vacio.textContent = 'Todavía no hay intentos. Al terminar un caso, queda aquí.';
      lista.replaceChildren(vacio);
      return;
    }
    lista.replaceChildren(...h.slice(0, HISTORIAL_VISIBLE).map((i) => {
      const li = document.createElement('li');
      li.className = `ss-attempt ${claseIntento(i)}`;
      li.innerHTML = '<span class="ss-attempt-score mono"></span><span class="ss-attempt-main"><b></b><small></small></span><span class="ss-attempt-date"></span>';
      li.querySelector('.ss-attempt-score')!.textContent = String(i.puntaje);
      li.querySelector('b')!.textContent = CASOS.find((c) => c.id === i.caso)?.nombre ?? i.caso;
      li.querySelector('small')!.textContent = `${i.modo === 'examen' ? 'Examen' : 'Práctica'} · ${i.calificacion}`;
      li.querySelector('.ss-attempt-date')!.textContent = fecha.format(i.fecha);
      return li;
    }));
  };
  for (const b of capa.querySelectorAll<HTMLButtonElement>('[data-modo]')) {
    b.addEventListener('click', () => { modo = b.dataset.modo as Modo; marcar(); });
  }

  const noMostrar = capa.querySelector<HTMLInputElement>('.ss-check-no-mostrar')!;
  noMostrar.checked = leerNoMostrar();
  noMostrar.addEventListener('change', () => guardarNoMostrar(noMostrar.checked));
  capa.querySelector('.ss-change')!.addEventListener('click', () => {
    capa.querySelector('#ss-pacientes')!.scrollIntoView({ behavior: 'smooth' });
  });
  capa.querySelector('.ss-entrar')!.addEventListener('click', () => {
    capa.hidden = true;
    alEmpezar(elegido, modo);
  });
  // La demostración siempre es el paciente normal en modo práctica
  capa.querySelector('.ss-demo')!.addEventListener('click', () => {
    capa.hidden = true;
    alVerDemo();
  });
  capa.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') capa.hidden = true;
  });

  const abrir = (casoActual: EleccionCaso, modoActual: Modo): void => {
    elegido = casoActual;
    modo = modoActual;
    marcar();
    capa.hidden = false;
    capa.scrollTop = 0;
    capa.querySelector<HTMLButtonElement>('.ss-entrar')!.focus({ preventScroll: true });
  };
  marcar();
  if (!leerNoMostrar()) abrir(elegido, modo);
  return { abrir };
}
