// Dibuja la ecografía con un shader de Three.js sobre un rectángulo que cubre el canvas.

import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4,
  DataTexture, RGBAFormat, FloatType, NearestFilter,
} from 'three';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shader';
import type { ParametrosShader } from './parametros';
import { MAX_RATIO_PIXELES_US, MUESTRAS_EJE_LARGO, FILAS_EJE_LARGO } from '../config/ultrasonido';

export interface RenderUS {
  ratio: () => number; // píxeles reales por píxel CSS (cambia con la calidad adaptable)
  cambiarEscala: (escala: number) => void;
  tamanoBuffer: () => [number, number];
  ajustarTamano: (anchoCss: number, altoCss: number) => void;
  dibujar: (p: ParametrosShader) => void;
}

// Devuelve null si el navegador no tiene WebGL.
export function crearRenderUS(canvas: HTMLCanvasElement): RenderUS | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false });
  } catch {
    return null;
  }
  const ratioBase = Math.min(window.devicePixelRatio || 1, MAX_RATIO_PIXELES_US);
  let ratio = ratioBase;
  let tamanoCss: [number, number] = [1, 1];
  renderer.setPixelRatio(ratio);

  // Anatomía por columnas para el eje largo (se rellena cada cuadro)
  const datosCortes = new Float32Array(MUESTRAS_EJE_LARGO * FILAS_EJE_LARGO * 4);
  const texturaCortes = new DataTexture(datosCortes, MUESTRAS_EJE_LARGO, FILAS_EJE_LARGO, RGBAFormat, FloatType);
  texturaCortes.magFilter = texturaCortes.minFilter = NearestFilter;
  texturaCortes.needsUpdate = true;

  const uniforms = {
    uResolucion: { value: new Vector2() },
    uEscala: { value: 1 },
    uIzquierda: { value: 0 },
    uAnchoMm: { value: 1 },
    uProfundidadMm: { value: 1 },
    uGananciaDb: { value: 0 },
    uFocoMm: { value: 0 },
    uPosicionSonda: { value: 0 },
    uLateralMm: { value: 0 },
    uRespiracion: { value: 0 },
    uSubcutaneoMm: { value: 0 },
    uVena: { value: new Vector4() },
    uArteria: { value: new Vector4() },
    uEcm0: { value: new Vector4() },
    uEcm1: { value: new Vector4() },
    uTiroides: { value: new Vector4() },
    uHayTiroides: { value: 0 },
    uTrombo: { value: 0 },
    uPleura: { value: new Vector3() },
    uDoppler: { value: 0 },
    uPulso: { value: 0 },
    uFlujoVena: { value: 0 },
    uTiempo: { value: 0 },
    uInstrumento: { value: 0 },
    uInstrumentoA: { value: new Vector2() },
    uInstrumentoB: { value: new Vector2() },
    uInstrumentoForma: { value: new Vector2(1, 0) },
    uTiendaVena: { value: new Vector3() },
    uTiendaArteria: { value: new Vector3() },
    uDispositivo: { value: 0 },
    uDispositivoTramo: { value: new Vector4() },
    uLongitudinal: { value: 0 },
    uCortes: { value: texturaCortes },
  };

  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, uniforms, depthTest: false,
  });
  const escena = new Scene();
  escena.add(new Mesh(new PlaneGeometry(2, 2), material));
  const camara = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    ratio: () => ratio,
    cambiarEscala: (escala) => {
      ratio = ratioBase * escala;
      renderer.setPixelRatio(ratio);
      renderer.setSize(...tamanoCss, false);
    },
    tamanoBuffer: () => [canvas.width, canvas.height],
    ajustarTamano: (anchoCss, altoCss) => {
      tamanoCss = [anchoCss, altoCss];
      renderer.setSize(anchoCss, altoCss, false);
    },
    dibujar: (p) => {
      uniforms.uResolucion.value.set(...p.resolucion);
      uniforms.uEscala.value = p.escala;
      uniforms.uIzquierda.value = p.izquierda;
      uniforms.uAnchoMm.value = p.anchoMm;
      uniforms.uProfundidadMm.value = p.profundidadMm;
      uniforms.uGananciaDb.value = p.gananciaDb;
      uniforms.uFocoMm.value = p.focoMm;
      uniforms.uPosicionSonda.value = p.posicionSondaMm;
      uniforms.uLateralMm.value = p.lateralMm;
      uniforms.uRespiracion.value = p.respiracion;
      uniforms.uSubcutaneoMm.value = p.subcutaneoMm;
      uniforms.uVena.value.set(...p.vena);
      uniforms.uArteria.value.set(...p.arteria);
      uniforms.uEcm0.value.set(...p.ecm0);
      uniforms.uEcm1.value.set(...p.ecm1);
      uniforms.uTiroides.value.set(...p.tiroides);
      uniforms.uHayTiroides.value = p.hayTiroides;
      uniforms.uTrombo.value = p.trombo;
      uniforms.uPleura.value.set(...p.pleura);
      uniforms.uDoppler.value = p.doppler;
      uniforms.uPulso.value = p.pulso;
      uniforms.uFlujoVena.value = p.flujoVena;
      uniforms.uTiempo.value = p.tiempo;
      uniforms.uInstrumento.value = p.instrumento;
      uniforms.uInstrumentoA.value.set(...p.instrumentoA);
      uniforms.uInstrumentoB.value.set(...p.instrumentoB);
      uniforms.uInstrumentoForma.value.set(...p.instrumentoForma);
      uniforms.uTiendaVena.value.set(...p.tiendaVena);
      uniforms.uTiendaArteria.value.set(...p.tiendaArteria);
      uniforms.uDispositivo.value = p.dispositivo;
      uniforms.uDispositivoTramo.value.set(...p.dispositivoTramo);
      uniforms.uLongitudinal.value = p.longitudinal;
      if (p.cortesEjeLargo) {
        datosCortes.set(p.cortesEjeLargo);
        texturaCortes.needsUpdate = true;
      }
      renderer.render(escena, camara);
    },
  };
}
