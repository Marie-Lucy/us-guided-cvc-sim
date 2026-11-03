// Vista externa: el paciente cubierto con el campo estéril, la ventana sobre
// el cuello derecho y la sonda, que se arrastra sobre la piel.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, HemisphereLight, DirectionalLight, Mesh, Group,
  BufferGeometry, Float32BufferAttribute, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry,
  DoubleSide, Raycaster, Vector2, Vector3, ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace,
} from 'three';
import * as E from '../config/escena';
import {
  puntoPiel, relieve, uvAPiel, pielASonda, sondaAPiel, ejesEnPiel, alturaCuerpo, dentroVentana, distanciaVentana,
  anguloCentro,
} from './cuerpo';
import { crearSonda, crearGel } from './modeloSonda';
import { crearAguja, crearMarcaEntrada, crearGuia, crearDilatador, crearCateter, type Herramienta } from './modeloAguja';
import {
  GUIA_VISIBLE_FUERA_MM, DILATADOR_LARGO_TOTAL_MM, CATETER_MAX_MM, CATETER_VISIBLE_FUERA_MAX_MM,
} from '../config/procedimiento';
import { anatomicoAMundo } from './cuerpo';
import type { P3 } from '../aguja/geometria';
import { PULSATILIDAD_FLASH_ARTERIAL } from '../config/aguja';
import { texturasPiel, texturaTela, texturasCampo } from './texturas';
import type { Sonda } from '../sonda/sonda';
import type { Calidad } from '../core/rendimiento';
import { suavizar, lerp } from '../core/matematica';

// Lo que la escena necesita saber de la aguja para dibujarla
export interface VistaAguja {
  visible: boolean;
  conJeringa: boolean; // al pasar la guía se desconecta
  // Técnica de Seldinger: null = no está
  guiaFuera: boolean; // la guía sale por la piel
  dilatadorMm: number | null;
  cateterMm: number | null;
  entrada: P3 | null;
  direccion: P3;
  insertadaMm: number;
  flash: { cantidad: number; tipo: 'vena' | 'arteria' | null };
  pulso: number; // 0 a 1, para que el flash arterial lata
}

export interface Escena3D {
  ajustarTamano: (anchoCss: number, altoCss: number) => void;
  cambiarCalidad: (calidad: Calidad) => void;
  // Centra la escena en el hueco libre entre los paneles y la achica si ese hueco es chico
  encuadrar: (centroXCss: number, centroYCss: number, altoLibreCss: number) => void;
  dibujar: (sonda: Sonda, etiquetas: boolean, aguja: VistaAguja) => void;
}

// 'sonda': tocar la piel mueve la sonda. 'entrada': tocar la piel elige dónde
// entra la aguja (la sonda se sigue arrastrando si se la toma a ella).
export type ModoPuntero = 'sonda' | 'entrada';

interface OpcionesInteraccion {
  alMoverSonda: (posicionMm: number, lateralMm: number) => void;
  alElegirEntrada: (posicionMm: number, lateralMm: number) => void;
  modo: () => ModoPuntero;
}

const LARGO_REFERENCIA_DIRECCION_MM = 20;
const ELEVACION_MARCA_MM = 0.3;

const MAX_RATIO_PIXELES_3D = 2;
const INTENSIDAD_CIELO = 1.1;
const INTENSIDAD_LAMPARA = 2.6;
const INTENSIDAD_RELLENO = 0.5;
const TAMANO_SOMBRA_PX = 2048;
const ALCANCE_SOMBRA_MM = 260;
const REPETICION_TEXTURA_PIEL = 3;
const REPETICION_TELA = 30;
const CERCA_MM = 5;
const LEJOS_MM = 3000;
const UMBRAL_CAMBIO = 1e-3;
const DESPEGUE_GEL_MM = 0.4;
// El cuello se ve entero si el hueco libre tiene al menos esta fracción del alto de la pantalla
const FRACCION_ALTO_ENCUADRE = 0.75;
const ZOOM_MINIMO = 0.4;

// ---------------------------------------------------------------------
// Piel
// ---------------------------------------------------------------------

interface Piel {
  malla: Mesh;
  hundir: (posicionMm: number, lateralMm: number, profundidadMm: number, longitudinal: boolean) => void;
}

function crearPiel(): Piel {
  const NA = E.SEGMENTOS_ANGULO;
  const NZ = E.SEGMENTOS_LARGO;
  const total = (NA + 1) * (NZ + 1);
  const angulos = new Float32Array(total);
  const zs = new Float32Array(total);
  const radiosBase = new Float32Array(total);
  const posiciones = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);

  for (let j = 0; j <= NZ; j++) {
    for (let i = 0; i <= NA; i++) {
      const k = j * (NA + 1) + i;
      const { angulo, z } = uvAPiel(i / NA, j / NZ);
      angulos[k] = angulo;
      zs[k] = z;
      radiosBase[k] = E.RADIO_CUELLO_MM + relieve(angulo, z);
      uvs[k * 2] = i / NA;
      uvs[k * 2 + 1] = j / NZ;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NA; i++) {
      const a = j * (NA + 1) + i;
      const b = a + 1;
      const c = a + NA + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometria = new BufferGeometry();
  geometria.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometria.setIndex(indices);

  const { color, relieve: mapaRelieve } = texturasPiel();
  for (const t of [color, mapaRelieve]) t.repeat.set(REPETICION_TEXTURA_PIEL, REPETICION_TEXTURA_PIEL);
  const material = new MeshPhysicalMaterial({
    color: E.COLOR_PIEL, map: color, bumpMap: mapaRelieve, bumpScale: 0.6,
    roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new Color('#ffd9c2'),
    side: DoubleSide,
  });
  const malla = new Mesh(geometria, material);
  malla.receiveShadow = true;
  malla.castShadow = true;

  // Hunde la piel bajo la huella de la sonda (y la devuelve a su lugar en el resto).
  const atributo = geometria.getAttribute('position') as Float32BufferAttribute;
  const hundir = (posicionMm: number, lateralMm: number, profundidadMm: number, longitudinal: boolean): void => {
    const centro = sondaAPiel(posicionMm, lateralMm);
    // La huella va alrededor del cuello (transversal) o a lo largo (longitudinal)
    const mitadLargo = (longitudinal ? E.SONDA_HUELLA_ANCHO_MM : E.SONDA_HUELLA_LARGO_MM) / 2;
    const mitadAncho = (longitudinal ? E.SONDA_HUELLA_LARGO_MM : E.SONDA_HUELLA_ANCHO_MM) / 2;
    for (let k = 0; k < total; k++) {
      let r = radiosBase[k];
      if (profundidadMm > 0) {
        const fuera = Math.hypot(
          Math.max(Math.abs((angulos[k] - centro.angulo) * E.RADIO_CUELLO_MM) - mitadLargo, 0),
          Math.max(Math.abs(zs[k] - centro.z) - mitadAncho, 0),
        );
        r -= profundidadMm * (1 - suavizar(0, E.HOYUELO_CAIDA_MM, fuera));
      }
      const giro = angulos[k] - E.ROTACION_CABEZA_RAD;
      atributo.setXYZ(k, r * Math.sin(giro), r * Math.cos(giro), zs[k]);
    }
    atributo.needsUpdate = true;
    geometria.computeVertexNormals();
    geometria.computeBoundingSphere();
  };
  hundir(0, 0, 0, false);
  return { malla, hundir };
}

// ---------------------------------------------------------------------
// Campo estéril
// ---------------------------------------------------------------------

// Altura de la tela: sobre el cuerpo, con pliegues que crecen lejos de la ventana.
function alturaCampo(x: number, z: number): number {
  // Sobre el cuello la tela sigue los relieves (ECM, clavícula): alturaCuerpo los incluye
  const base = alturaCuerpo(x, z);
  const fuerza = E.PLIEGUES_AMPLITUD_MM * suavizar(0, E.PLIEGUES_DISTANCIA_COMPLETA_MM, distanciaVentana(x, z));
  // Los pliegues solo levantan la tela: nunca la meten bajo la piel
  const ondas = 0.55 * Math.sin(0.05 * x + 0.021 * z) + 0.45 * Math.sin(0.037 * z - 0.043 * x + 1.3);
  return base + E.CAMPO_SEPARACION_MM + fuerza * (0.5 + 0.5 * ondas);
}

function crearCampo(): Mesh {
  const plano = new PlaneGeometry(E.CAMPO_ANCHO_MM, E.CAMPO_LARGO_MM, E.CAMPO_SEGMENTOS, E.CAMPO_SEGMENTOS);
  plano.rotateX(-Math.PI / 2);
  plano.translate(0, 0, E.CAMPO_CENTRO_Z_MM);
  const pos = plano.getAttribute('position') as Float32BufferAttribute;
  for (let k = 0; k < pos.count; k++) pos.setY(k, alturaCampo(pos.getX(k), pos.getZ(k)));
  plano.computeVertexNormals();

  // La ventana se recorta con un canal alfa: borde liso aunque la malla sea gruesa
  const { color, alfa } = texturasCampo(
    E.CAMPO_TEXTURA_PX, E.CAMPO_ANCHO_MM, E.CAMPO_LARGO_MM, E.CAMPO_CENTRO_Z_MM,
    dentroVentana, E.COLOR_CAMPO, E.COLOR_ADHESIVO, E.BORDE_ADHESIVO_MM,
  );
  const trama = texturaTela();
  trama.repeat.set(REPETICION_TELA, REPETICION_TELA);
  const material = new MeshStandardMaterial({
    map: color, alphaMap: alfa, alphaTest: 0.5, roughness: 0.95, bumpMap: trama, bumpScale: 0.4, side: DoubleSide,
  });
  const campo = new Mesh(plano, material);
  campo.receiveShadow = true;
  campo.castShadow = true;
  return campo;
}

function crearCama(): Mesh {
  const cama = new Mesh(
    new PlaneGeometry(E.CAMPO_ANCHO_MM * 3, E.CAMPO_LARGO_MM * 3),
    new MeshStandardMaterial({ color: E.COLOR_CAMA, roughness: 1 }),
  );
  cama.rotateX(-Math.PI / 2);
  cama.position.y = E.ALTURA_CAMA_MM - 1;
  cama.receiveShadow = true;
  return cama;
}

// ---------------------------------------------------------------------
// Etiquetas de referencias anatómicas (HTML sobre el canvas)
// ---------------------------------------------------------------------

interface Etiqueta { el: HTMLElement; punto: Vector3 }

function crearEtiquetas(contenedor: HTMLElement): Etiqueta[] {
  const SEPARACION_PIEL_MM = 7;
  const enPiel = (angulo: number, z: number): Vector3 => {
    const { punto, normal } = ejesEnPiel(angulo, z);
    return new Vector3(
      punto.x + normal.x * SEPARACION_PIEL_MM, punto.y + normal.y * SEPARACION_PIEL_MM, punto.z + normal.z * SEPARACION_PIEL_MM,
    );
  };
  const R = E.RADIO_CUELLO_MM;
  // Abajo, junto a la clavícula, donde los dos haces del ECM están separados.
  // Los textos se abren hacia los lados para no taparse con la sonda.
  const z = 0;
  const separacion = 30; // mm a cada lado del centro
  const definiciones: [string, Vector3][] = [
    ['Clavícula', enPiel(anguloCentro(z) + 0.15, E.Z_CLAVICULA_MEDIAL_MM - 22)],
    ['ECM esternal', enPiel(anguloCentro(z) - separacion / R, z + 4)],
    ['ECM clavicular', enPiel(anguloCentro(z) + separacion / R, z + 4)],
    ['Triángulo', enPiel(anguloCentro(z), z - 4)],
    ['Cabeza', new Vector3(-20, 112, 175)],
  ];
  return definiciones.map(([texto, punto]) => {
    const el = document.createElement('span');
    el.className = 'etiqueta-3d';
    el.textContent = texto;
    contenedor.appendChild(el);
    return { el, punto };
  });
}

// ---------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------

export function crearEscena3D(
  canvas: HTMLCanvasElement, contenedorEtiquetas: HTMLElement, opciones: OpcionesInteraccion,
): Escena3D | null {
  let renderer: WebGLRenderer;
  try {
    // Fondo transparente: se ve el degradé de la página, como en los otros simuladores
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  const ratioBase = Math.min(window.devicePixelRatio || 1, MAX_RATIO_PIXELES_3D);
  renderer.setPixelRatio(ratioBase);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const escena = new Scene();

  const camara = new PerspectiveCamera(E.CAMARA_FOV, 1, CERCA_MM, LEJOS_MM);
  camara.position.set(E.CAMARA_POSICION.x, E.CAMARA_POSICION.y, E.CAMARA_POSICION.z);
  camara.lookAt(E.CAMARA_OBJETIVO.x, E.CAMARA_OBJETIVO.y, E.CAMARA_OBJETIVO.z);

  // Luz ambiente de quirófano + lámpara cenital con sombras + relleno suave
  escena.add(new HemisphereLight('#e8eef7', '#3b3226', INTENSIDAD_CIELO));
  const lampara = new DirectionalLight('#fff4e6', INTENSIDAD_LAMPARA);
  lampara.position.set(280, 300, 160); // rasante, para que se vean los relieves
  lampara.target.position.set(E.CAMARA_OBJETIVO.x, 0, E.CAMARA_OBJETIVO.z);
  lampara.castShadow = true;
  lampara.shadow.mapSize.set(TAMANO_SOMBRA_PX, TAMANO_SOMBRA_PX);
  const s = lampara.shadow.camera;
  s.left = s.bottom = -ALCANCE_SOMBRA_MM;
  s.right = s.top = ALCANCE_SOMBRA_MM;
  s.near = 50;
  s.far = 1000;
  lampara.shadow.bias = -0.0005;
  lampara.shadow.radius = 4;
  escena.add(lampara, lampara.target);
  const relleno = new DirectionalLight('#cfe0ff', INTENSIDAD_RELLENO);
  relleno.position.set(-300, 200, -200);
  escena.add(relleno);

  const piel = crearPiel();
  escena.add(piel.malla, crearCampo(), crearCama());

  const sonda = crearSonda();
  const gel = crearGel();
  const grupoSonda = new Group();
  grupoSonda.add(sonda, gel);
  escena.add(grupoSonda);

  const etiquetas = crearEtiquetas(contenedorEtiquetas);

  // ---- Aguja ----
  const aguja = crearAguja();
  const marcaEntrada = crearMarcaEntrada();
  escena.add(aguja.grupo, marcaEntrada);
  const ejeY = new Vector3(0, 1, 0);
  const guia = crearGuia();
  const dilatador = crearDilatador();
  const cateter = crearCateter();
  escena.add(guia.grupo, dilatador.grupo, cateter.grupo);

  // Pone una herramienta sobre el trayecto: punta a 'adentroMm' de la piel, y 'afueraMm' visible
  const colocarHerramienta = (h: Herramienta, e: Vector3, d: Vector3, adentroMm: number, afueraMm: number): void => {
    h.grupo.visible = true;
    h.grupo.quaternion.setFromUnitVectors(ejeY, d.clone().negate());
    h.grupo.position.copy(e).addScaledVector(d, adentroMm);
    h.ajustarLargo(adentroMm + afueraMm);
  };

  const colocarAguja = (v: VistaAguja): void => {
    const hayEntrada = v.entrada !== null;
    const mostrar = v.visible && hayEntrada;
    aguja.grupo.visible = mostrar;
    marcaEntrada.visible = mostrar && v.insertadaMm === 0;
    guia.grupo.visible = dilatador.grupo.visible = cateter.grupo.visible = false;
    if (!v.entrada) return;
    // La aguja es recta: va de la entrada en la piel hacia la dirección elegida
    const e = anatomicoAMundo(v.entrada);
    const lejos = anatomicoAMundo({
      x: v.entrada.x + v.direccion.x * LARGO_REFERENCIA_DIRECCION_MM,
      y: v.entrada.y + v.direccion.y * LARGO_REFERENCIA_DIRECCION_MM,
      z: v.entrada.z + v.direccion.z * LARGO_REFERENCIA_DIRECCION_MM,
    });
    const d = new Vector3(lejos.x - e.x, lejos.y - e.y, lejos.z - e.z).normalize();
    aguja.grupo.quaternion.setFromUnitVectors(ejeY, d.clone().negate());
    aguja.grupo.position.set(e.x, e.y, e.z).addScaledVector(d, v.insertadaMm);
    aguja.conJeringa(v.conJeringa);
    // El flash arterial late con el pulso
    const latido = v.flash.tipo === 'arteria' ? 1 - PULSATILIDAD_FLASH_ARTERIAL * (1 - v.pulso) : 1;
    if (v.conJeringa) aguja.llenar(v.flash.cantidad * latido, v.flash.tipo);

    // Seldinger: cada herramienta entra por el mismo trayecto
    const entradaPiel = new Vector3(e.x, e.y, e.z);
    if (v.guiaFuera) colocarHerramienta(guia, entradaPiel, d, 0, GUIA_VISIBLE_FUERA_MM);
    if (v.dilatadorMm !== null) {
      colocarHerramienta(dilatador, entradaPiel, d, v.dilatadorMm, Math.max(DILATADOR_LARGO_TOTAL_MM - v.dilatadorMm, 0));
    }
    if (v.cateterMm !== null) {
      // Dentro del cuello el catéter sigue a la vena; afuera se ve el tramo restante
      const adentro = Math.min(v.cateterMm, v.insertadaMm);
      const afuera = Math.min(CATETER_MAX_MM - v.cateterMm, CATETER_VISIBLE_FUERA_MAX_MM);
      colocarHerramienta(cateter, entradaPiel, d, adentro, afuera);
    }

    const { angulo, z } = sondaAPiel(v.entrada.z, v.entrada.x);
    const { normal } = ejesEnPiel(angulo, z);
    const n = new Vector3(normal.x, normal.y, normal.z);
    marcaEntrada.position.set(e.x, e.y, e.z).addScaledVector(n, ELEVACION_MARCA_MM);
    marcaEntrada.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
  };

  // ---- Colocar la sonda ----
  let ultimo = { pos: NaN, lat: NaN, comp: NaN, orientacion: '' };
  const colocarSonda = (s: Sonda): void => {
    if (Math.abs(s.posicionMm - ultimo.pos) < UMBRAL_CAMBIO && Math.abs(s.lateralMm - ultimo.lat) < UMBRAL_CAMBIO
      && Math.abs(s.compresion - ultimo.comp) < UMBRAL_CAMBIO && s.orientacion === ultimo.orientacion) return;
    ultimo = { pos: s.posicionMm, lat: s.lateralMm, comp: s.compresion, orientacion: s.orientacion };

    const longitudinal = s.orientacion === 'longitudinal';
    const hundimiento = s.compresion * E.SONDA_HUNDIMIENTO_MAX_MM;
    piel.hundir(s.posicionMm, s.lateralMm, hundimiento, longitudinal);
    const { angulo, z } = sondaAPiel(s.posicionMm, s.lateralMm);
    const { largo, normal, cuello } = ejesEnPiel(angulo, z);
    const punto = puntoPiel(angulo, z, hundimiento);
    // Girada 90°: la huella sigue al cuello y la marca (lado −x local) apunta a la cabeza
    const ejeHuella = longitudinal ? { x: -cuello.x, y: -cuello.y, z: -cuello.z } : largo;
    const x = new Vector3(ejeHuella.x, ejeHuella.y, ejeHuella.z);
    const y = new Vector3(normal.x, normal.y, normal.z);
    const zEje = new Vector3().crossVectors(x, y);
    grupoSonda.matrix.makeBasis(x, y, zEje).setPosition(punto.x, punto.y, punto.z);
    grupoSonda.matrixAutoUpdate = false;
    grupoSonda.matrixWorldNeedsUpdate = true;
    // El gel se aplasta más cuanto más se presiona
    gel.position.y = DESPEGUE_GEL_MM;
    gel.scale.y = lerp(1.4, 0.6, s.compresion);
  };

  // ---- Arrastrar la sonda ----
  const rayo = new Raycaster();
  const puntero = new Vector2();
  let arrastrando = false;

  const pielBajoPuntero = (e: PointerEvent): { posicionMm: number; lateralMm: number } | null => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    const impacto = rayo.intersectObject(piel.malla)[0];
    if (!impacto?.uv) return null;
    const { angulo, z } = uvAPiel(impacto.uv.x, impacto.uv.y);
    return pielASonda(angulo, z);
  };
  const sobreSonda = (e: PointerEvent): boolean => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    return rayo.intersectObject(sonda, true).length > 0;
  };

  canvas.addEventListener('pointerdown', (e) => {
    const tocaSonda = sobreSonda(e);
    const destino = pielBajoPuntero(e);
    if (!destino && !tocaSonda) return;
    e.preventDefault();
    // Modo aguja: tocar la piel (no la sonda) elige el punto de entrada
    if (opciones.modo() === 'entrada' && !tocaSonda) {
      if (destino) opciones.alElegirEntrada(destino.posicionMm, destino.lateralMm);
      return;
    }
    arrastrando = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    if (destino && !tocaSonda) opciones.alMoverSonda(destino.posicionMm, destino.lateralMm);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (arrastrando) {
      const destino = pielBajoPuntero(e);
      if (destino) opciones.alMoverSonda(destino.posicionMm, destino.lateralMm);
      return;
    }
    canvas.style.cursor = sobreSonda(e) ? 'grab' : pielBajoPuntero(e) ? 'crosshair' : 'default';
  });
  const soltar = (e: PointerEvent): void => {
    arrastrando = false;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  // ---- Etiquetas ----
  const proyectado = new Vector3();
  const moverEtiquetas = (visibles: boolean, ancho: number, alto: number): void => {
    for (const { el, punto } of etiquetas) {
      el.hidden = !visibles;
      if (!visibles) continue;
      proyectado.copy(punto).project(camara);
      el.style.transform = `translate(-50%, -50%) translate(${((proyectado.x + 1) / 2) * ancho}px, ${((1 - proyectado.y) / 2) * alto}px)`;
    }
  };

  let tamano = { ancho: 1, alto: 1 };
  // La escena casi no cambia: solo se vuelve a dibujar si algo de lo que se ve cambió
  let ultimaClave = '';
  let forzar = true;
  const clave = (s: Sonda, etiquetasVisibles: boolean, v: VistaAguja): string => {
    const r = (n: number | null): string => (n === null ? '-' : n.toFixed(2));
    const latido = v.flash.tipo === 'arteria' && v.conJeringa ? r(v.pulso) : '';
    return [
      r(s.posicionMm), r(s.lateralMm), r(s.compresion), s.orientacion, etiquetasVisibles,
      v.visible, v.conJeringa, v.guiaFuera, r(v.dilatadorMm), r(v.cateterMm), r(v.insertadaMm),
      v.entrada ? `${r(v.entrada.x)},${r(v.entrada.z)}` : '-', r(v.direccion.x), r(v.direccion.y),
      r(v.flash.cantidad), v.flash.tipo, latido,
    ].join('|');
  };

  return {
    ajustarTamano: (ancho, alto) => {
      tamano = { ancho, alto };
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      forzar = true;
    },
    encuadrar: (cx, cy, altoLibre) => {
      const { ancho, alto } = tamano;
      camara.setViewOffset(ancho, alto, ancho / 2 - cx, alto / 2 - cy, ancho, alto);
      camara.zoom = Math.min(Math.max(altoLibre / (alto * FRACCION_ALTO_ENCUADRE), ZOOM_MINIMO), 1);
      camara.updateProjectionMatrix();
      forzar = true;
    },
    cambiarCalidad: ({ escala, sombras }) => {
      renderer.setPixelRatio(ratioBase * escala);
      renderer.setSize(tamano.ancho, tamano.alto, false);
      lampara.castShadow = sombras; // three recompila los materiales al cambiar las luces con sombra
      forzar = true;
    },
    dibujar: (s, verEtiquetas, vistaAguja) => {
      const k = clave(s, verEtiquetas, vistaAguja);
      if (!forzar && k === ultimaClave) return;
      ultimaClave = k;
      forzar = false;
      colocarSonda(s);
      colocarAguja(vistaAguja);
      renderer.render(escena, camara);
      moverEtiquetas(verEtiquetas, tamano.ancho, tamano.alto);
    },
  };
}
