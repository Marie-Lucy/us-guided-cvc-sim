// Textos de los controles de Seldinger según la fase (sin DOM, para testear).

import type { Fase } from '../config/fases';
import { MM_POR_CM } from '../config/ultrasonido';
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

const cm = (mm: number): string => (mm / MM_POR_CM).toFixed(1);

export function textosSeldinger(fase: Fase, s: EstadoSeldinger): TextosSeldinger | null {
  if (fase === 'guia') {
    const g = s.guia;
    const estado = g.resistencia ? ' · ¡resistencia!' : nivelEctopia(s) > 0 ? ' · extrasístoles' : '';
    return {
      menos: '◀ Retirar guía',
      mas: 'Avanzar guía ▶',
      accion: s.agujaRetirada ? null : 'Retirar la aguja',
      accionBloqueada: s.agujaRetirada ? null : motivoParaRetirarAguja(s),
      confirmar: s.agujaRetirada && !g.confirmada,
      lectura: `Guía ${cm(g.insertadaMm)} cm más allá de la aguja${estado}${g.confirmada ? ' · confirmada' : ''}`,
    };
  }
  if (fase === 'dilatacion') {
    const d = s.dilatador;
    return {
      menos: '◀ Retirar dilatador',
      mas: 'Avanzar dilatador ▶',
      accion: null,
      accionBloqueada: null,
      confirmar: false,
      lectura: `Dilatador ${cm(d.mm)} cm · vaso a ${cm(s.trayectoMm)} cm${d.tractoDilatado ? ' · trayecto dilatado' : ''}`,
    };
  }
  if (fase === 'cateter') {
    const objetivo = cateterEnObjetivo(s) ? ' · en rango (12–16 cm)' : '';
    return {
      menos: '◀ Retirar catéter',
      mas: 'Avanzar catéter ▶',
      accion: s.guia.retirada ? null : 'Retirar la guía',
      accionBloqueada: s.guia.retirada ? null : motivoParaRetirarGuia(s),
      confirmar: false,
      lectura: `Catéter a ${cm(s.cateter.mm)} cm de la piel${objetivo}${s.guia.retirada ? ' · guía retirada' : ''}`,
    };
  }
  return null;
}
