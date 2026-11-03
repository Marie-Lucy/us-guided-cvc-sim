// Selectores de idioma, como en los otros simuladores: botones ES · PT · EN en la
// portada y un desplegable compacto en la barra superior.

import { IDIOMAS, idiomaActual, cambiarIdioma, alCambiarIdioma, t, type Idioma } from '../i18n';

// Botones segmentados (portada)
export function crearBotonesIdioma(): HTMLElement {
  const grupo = document.createElement('div');
  grupo.className = 'lang-toggle';
  grupo.setAttribute('role', 'group');
  for (const i of IDIOMAS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = i.corto;
    b.title = i.nombre;
    b.lang = i.locale;
    b.dataset.idioma = i.id;
    b.addEventListener('click', () => cambiarIdioma(i.id, true));
    grupo.append(b);
  }
  const marcar = (actual: Idioma): void => {
    grupo.setAttribute('aria-label', t('idioma.etiqueta'));
    for (const b of grupo.querySelectorAll<HTMLButtonElement>('button')) {
      const on = b.dataset.idioma === actual;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };
  marcar(idiomaActual());
  alCambiarIdioma(marcar);
  return grupo;
}

// Desplegable (barra superior): códigos cortos para que quepa en el celular
export function crearDesplegableIdioma(): HTMLSelectElement {
  const lista = document.createElement('select');
  lista.className = 'chip lang-select';
  for (const i of IDIOMAS) {
    const o = document.createElement('option');
    o.value = i.id;
    o.textContent = i.corto;
    o.title = i.nombre;
    o.lang = i.locale;
    lista.append(o);
  }
  lista.addEventListener('change', () => cambiarIdioma(lista.value as Idioma, true));
  const marcar = (actual: Idioma): void => {
    lista.value = actual;
    lista.title = t('idioma.etiqueta');
    lista.setAttribute('aria-label', t('idioma.etiqueta'));
  };
  marcar(idiomaActual());
  alCambiarIdioma(marcar);
  return lista;
}
