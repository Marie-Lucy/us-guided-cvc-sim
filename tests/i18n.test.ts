import { afterEach, describe, expect, it } from 'vitest';
import es from '../src/i18n/es';
import { DICCIONARIOS, IDIOMAS, cambiarIdioma, detectarIdioma, existeClave, fmt, t, type Idioma } from '../src/i18n';
import { PASOS, INFO_PASOS, tareas, pista } from '../src/ui/guiaPasos';
import { CASOS } from '../src/casos/casos';
import { PASOS_DEMO } from '../src/procedimiento/demo';
import { FASES } from '../src/config/fases';
import { evaluar, complicaciones } from '../src/evaluacion/evaluacion';
import { registroNuevo } from '../src/evaluacion/registro';
import { estadoInicial } from '../src/aguja/aguja';
import { motivoParaGuia } from '../src/procedimiento/seldinger';

const CLAVES = Object.keys(es) as (keyof typeof es)[];
const OTROS: Idioma[] = ['pt', 'en'];
const marcadores = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

// Textos que son iguales en todos los idiomas (siglas, términos que no cambian)
const IGUALES: Partial<Record<Idioma, ReadonlySet<string>>> = {
  pt: new Set([
    'idioma.etiqueta', 'inicio.modo', 'inicio.pacientes', 'inicio.pasosSub', 'inicio.controles', 'control.comprimir',
    'inicio.paciente', 'nivel.basico', 'caso.obeso.nombre', 'hud.fase', 'hud.reiniciar', 'hud.terminar', 'panel.monitor',
    'ctrl.medial', 'ctrl.lateral', 'eco.girar', 'eco.girarTitulo', 'eco.esquema', 'mentor.badge', 'monitor.fc',
    'sel.lecturaDilatador', 'us.arteria', 'us.ecm', 'cuello.clavicula', 'cuello.ecmEsternal', 'cuello.ecmClavicular',
    'paso.dilatacion.herramienta', 'eval.caso', 'eval.repetir', 'gravedad.grave', 'gravedad.moderada', 'gravedad.leve',
    'nota.excelente', 'demo.badge', 'tarea.cateter', 'sel.extrasistoles',
  ]),
  en: new Set([
    'mentor.badge', 'ctrl.medial', 'ctrl.lateral', 'panel.monitor', 'demo.badge', 'eval.caso',
  ]),
};

afterEach(() => cambiarIdioma('es'));

describe('diccionarios', () => {
  it('ofrecen español, portugués e inglés, con las variantes de Latinoamérica', () => {
    expect(IDIOMAS.map((i) => i.locale)).toEqual(['es-419', 'pt-BR', 'en-US']);
  });

  for (const idioma of OTROS) {
    describe(idioma, () => {
      const d = DICCIONARIOS[idioma];
      it('tiene exactamente las claves del español, ninguna vacía', () => {
        expect(Object.keys(d).sort()).toEqual([...CLAVES].sort());
        for (const k of CLAVES) expect(d[k].trim().length, k).toBeGreaterThan(0);
      });

      it('conserva cada {marcador} del texto en español', () => {
        for (const k of CLAVES) expect(marcadores(d[k]), k).toEqual(marcadores(es[k]));
      });

      it('traduce todo salvo siglas y términos iguales', () => {
        const iguales = CLAVES.filter((k) => d[k] === es[k] && !IGUALES[idioma]?.has(k));
        expect(iguales).toEqual([]);
      });

      it('no deja palabras sueltas en español', () => {
        const restos = /\b(la|el|los|las|guía|aguja|sonda|pinchazo|ecografía|y|con|sin)\b/i;
        const malos = CLAVES.filter((k) => idioma === 'en' && restos.test(d[k]));
        expect(malos).toEqual([]);
      });
    });
  }

  it('existen todas las claves que se arman en tiempo de ejecución', () => {
    const dinamicas = [
      ...FASES.map((f) => `fase.${f}`),
      ...PASOS.flatMap((p) => ['nombre', 'herramienta', 'objetivo', 'porque'].map((c) => `paso.${p}.${c}`)),
      ...CASOS.flatMap((c) => [`caso.${c.id}.nombre`, `caso.${c.id}.descripcion`, `caso.${c.id}.claves`, `nivel.${c.nivel}`]),
      ...['puncion_carotida', 'neumotorax', 'dilatacion_arterial', 'cateter_arterial', 'puncion_trombo', 'pared_posterior',
        'dilatador_profundo', 'ectopia', 'cateter_profundo'].flatMap((c) => [`comp.${c}.titulo`, `comp.${c}.explicacion`]),
      ...['grave', 'moderada', 'leve'].map((g) => `gravedad.${g}`),
      ...['tiempo', 'fallido', 'excelente', 'bien', 'mejorar'].map((n) => `nota.${n}`),
      ...['practica', 'examen'].map((m) => `modo.${m}`),
      ...PASOS_DEMO.map((p) => p.dice),
    ];
    expect(dinamicas.filter((k) => !existeClave(k))).toEqual([]);
  });
});

describe('cambio de idioma', () => {
  it('detecta el idioma guardado o el del navegador; si no hay ninguno, inglés', () => {
    expect(detectarIdioma(null, ['pt-BR', 'en'])).toBe('pt');
    expect(detectarIdioma(null, ['es-MX'])).toBe('es');
    expect(detectarIdioma('en', ['es-AR'])).toBe('en');
    expect(detectarIdioma(null, ['fr-FR', 'de'])).toBe('en');
  });

  it('usa la coma decimal en portugués', () => {
    cambiarIdioma('pt');
    expect(fmt(2.5, 1)).toBe('2,5');
    cambiarIdioma('en');
    expect(fmt(2.5, 1)).toBe('2.5');
  });

  it('los pasos, los pacientes y la demostración siguen al idioma sin reconstruirse', () => {
    cambiarIdioma('en');
    expect(INFO_PASOS.guia.nombre).toBe('Pass the guidewire');
    expect(CASOS[0].nombre).toBe('Normal anatomy');
    expect(CASOS[0].dificultad).toBe('Basic');
    cambiarIdioma('pt');
    expect(INFO_PASOS.puncion.herramienta).toBe('Agulha');
    expect(CASOS[2].nombre).toBe('Paciente hipovolêmico');
    expect(t(PASOS_DEMO[0].dice)).toMatch(/^Demonstração/);
  });

  it('reemplaza los parámetros', () => {
    cambiarIdioma('en');
    expect(t('consejo.intentos', { n: 3 })).toMatch(/^You needed 3 passes/);
    cambiarIdioma('pt');
    expect(t('aguja.lectura', { mm: 12, n: 1 })).toBe('Inserida 12 mm · tentativa 1');
  });
});

describe('un caso jugado en inglés y portugués', () => {
  const estado = { registro: registroNuevo(), aguja: estadoInicial(), seldinger: null };

  it('inglés: tareas, pistas, requisitos y evaluación', () => {
    cambiarIdioma('en');
    expect(tareas('exploracion', estado)[0].texto).toBe('Compress and watch the vein collapse');
    expect(pista('exploracion', estado, null).texto).toBe('Now: compress and watch the vein collapse.');
    expect(motivoParaGuia(estado.aguja)).toMatch(/^Aspirate/);
    const r = evaluar({ registro: registroNuevo(), intentos: 1, eventosAguja: ['puncion_carotida'], seldinger: null, tiempoS: 60 });
    expect(r.calificacion).toBe('Procedure not achieved');
    expect(r.nota).toBe('fallido');
    expect(r.complicaciones[0].titulo).toBe('Carotid puncture');
  });

  it('portugués: la nota se guarda como id y se traduce al mostrarla', () => {
    cambiarIdioma('pt');
    const [c] = complicaciones(['neumotorax']);
    expect(c.titulo).toBe('Pneumotórax');
    const r = evaluar({ registro: registroNuevo(), intentos: 1, eventosAguja: [], seldinger: null, tiempoS: 60, tiempoAgotado: true });
    expect(r.nota).toBe('tiempo');
    expect(r.calificacion).toBe('Tempo esgotado');
  });
});
