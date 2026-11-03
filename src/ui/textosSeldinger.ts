// Textos de los controles de Seldinger según la fase (sin DOM, para testear).

import type { Fase } from '../config/fases';
import { MM_POR_CM } from '../config/ultrasonido';
import { t, fmt } from '../i18n';
import {
  nivelEctopia, motivoParaRetirarAguja, motivoParaRetirarGuia, cateterEnObjetivo, type EstadoSeldinger,
} from '../procedimiento/seldinger';

export interface TextosSeldinger {
  menos: string;
  mas: string;
  accion: string | null; // botón de acción del paso (retirar aguja / retirar guía)
  accionBloqueada: string | null; // por qué no se puede todavía
  confirmar: boolean; // mostrar "Confirmar guía"
  lectura: string;
}

const cm = (mm: number): string => fmt(mm / MM_POR_CM, 1);
// Lectura con sus agregados (" · confirmada", …) solo si corresponden
const unir = (base: string, ...extras: (string | false)[]): string =>
  [base, ...extras.filter((x): x is string => !!x)].join(' · ');

export function textosSeldinger(fase: Fase, s: EstadoSeldinger): TextosSeldinger | null {
  if (fase === 'guia') {
    const g = s.guia;
    const estado = g.resistencia ? t('sel.resistencia') : nivelEctopia(s) > 0 && t('sel.extrasistoles');
    return {
      menos: t('sel.retirarGuia'),
      mas: t('sel.avanzarGuia'),
      accion: s.agujaRetirada ? null : t('sel.retirarLaAguja'),
      accionBloqueada: s.agujaRetirada ? null : motivoParaRetirarAguja(s),
      confirmar: s.agujaRetirada && !g.confirmada,
      lectura: unir(t('sel.lecturaGuia', { cm: cm(g.insertadaMm) }), estado, g.confirmada && t('sel.confirmada')),
    };
  }
  if (fase === 'dilatacion') {
    const d = s.dilatador;
    return {
      menos: t('sel.retirarDilatador'),
      mas: t('sel.avanzarDilatador'),
      accion: null,
      accionBloqueada: null,
      confirmar: false,
      lectura: unir(t('sel.lecturaDilatador', { cm: cm(d.mm), vaso: cm(s.trayectoMm) }), d.tractoDilatado && t('sel.dilatado')),
    };
  }
  if (fase === 'cateter') {
    return {
      menos: t('sel.retirarCateter'),
      mas: t('sel.avanzarCateter'),
      accion: s.guia.retirada ? null : t('sel.retirarLaGuia'),
      accionBloqueada: s.guia.retirada ? null : motivoParaRetirarGuia(s),
      confirmar: false,
      lectura: unir(
        t('sel.lecturaCateter', { cm: cm(s.cateter.mm) }), cateterEnObjetivo(s) && t('sel.enRango'), s.guia.retirada && t('sel.guiaRetirada'),
      ),
    };
  }
  return null;
}
