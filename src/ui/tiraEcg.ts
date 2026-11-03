// Tira de ECG que se desplaza: los últimos segundos de la derivación II.

import { voltajeEcg } from '../procedimiento/ecg';
import {
  ECG_VENTANA_S, ECG_COLOR_TRAZO, ECG_COLOR_ECTOPIA, ECG_GROSOR_PX, ECG_ESCALA_MV,
} from '../config/procedimiento';

type Nivel = 0 | 1 | 2;

export interface TiraEcg {
  dibujar: (ctx: CanvasRenderingContext2D, ancho: number, alto: number, tiempo: number, nivel: Nivel) => void;
  reiniciar: () => void;
}

const LINEA_BASE = 0.62; // fracción del alto
const PASO_PX = 1;
const COLOR_FONDO = '#ffffff';
const COLOR_REJILLA = '#f1f5f9';
const PASO_REJILLA_S = 0.2; // cuadro grande del papel de ECG

export function crearTiraEcg(): TiraEcg {
  // Historia de cambios de nivel, para que los latidos ya dibujados no cambien
  let historia: { t: number; nivel: Nivel }[] = [{ t: -Infinity, nivel: 0 }];
  const nivelEn = (t: number): Nivel => {
    for (let i = historia.length - 1; i >= 0; i--) if (historia[i].t <= t) return historia[i].nivel;
    return 0;
  };

  return {
    reiniciar: () => { historia = [{ t: -Infinity, nivel: 0 }]; },
    dibujar: (ctx, ancho, alto, tiempo, nivel) => {
      if (historia[historia.length - 1].nivel !== nivel) historia.push({ t: tiempo, nivel });
      // Olvidar lo que ya salió de la ventana
      while (historia.length > 2 && historia[1].t < tiempo - ECG_VENTANA_S * 2) historia.shift();

      ctx.fillStyle = COLOR_FONDO;
      ctx.fillRect(0, 0, ancho, alto);
      ctx.strokeStyle = COLOR_REJILLA;
      ctx.lineWidth = 1;
      const pxPorS = ancho / ECG_VENTANA_S;
      const desfase = (tiempo % PASO_REJILLA_S) * pxPorS;
      for (let x = ancho - desfase; x > 0; x -= PASO_REJILLA_S * pxPorS) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, alto);
        ctx.stroke();
      }

      ctx.strokeStyle = nivel > 0 ? ECG_COLOR_ECTOPIA : ECG_COLOR_TRAZO;
      ctx.lineWidth = ECG_GROSOR_PX;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= ancho; x += PASO_PX) {
        const t = tiempo - ECG_VENTANA_S + x / pxPorS;
        const y = alto * LINEA_BASE - voltajeEcg(Math.max(t, 0), nivelEn) * alto * ECG_ESCALA_MV;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
  };
}
