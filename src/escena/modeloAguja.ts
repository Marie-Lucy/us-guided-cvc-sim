// Aguja introductora con jeringa. Ejes locales: la punta está en el origen y la
// aguja se extiende hacia +y (hacia el cono y la jeringa).

import {
  Group, Mesh, MeshPhysicalMaterial, CylinderGeometry, ConeGeometry, RingGeometry, MeshBasicMaterial, DoubleSide, Color,
} from 'three';
import {
  RADIO_GUIA_MM, RADIO_DILATADOR_MM, RADIO_CATETER_MM,
  COLOR_GUIA_3D, COLOR_DILATADOR_3D, COLOR_CATETER_3D, COLOR_CONECTOR_CATETER_3D,
} from '../config/procedimiento';
import {
  LARGO_AGUJA_MM, RADIO_AGUJA_MM, LARGO_CONO_MM, LARGO_JERINGA_MM, RADIO_JERINGA_MM,
  COLOR_AGUJA, COLOR_CONO, COLOR_JERINGA, COLOR_SANGRE_VENOSA, COLOR_SANGRE_ARTERIAL, COLOR_MARCA_ENTRADA,
} from '../config/aguja';

const SEGMENTOS = 24;
const LARGO_BISEL_MM = 2.2;
const ESPESOR_PARED_JERINGA_MM = 0.8;

export interface ModeloAguja {
  grupo: Group;
  // cantidad: 0 a 1; tipo: qué sangre
  llenar: (cantidad: number, tipo: 'vena' | 'arteria' | null) => void;
  // Al pasar la guía se desconecta la jeringa
  conJeringa: (visible: boolean) => void;
}

export function crearAguja(): ModeloAguja {
  const grupo = new Group();
  const acero = new MeshPhysicalMaterial({ color: COLOR_AGUJA, metalness: 1, roughness: 0.18 });
  const plastico = new MeshPhysicalMaterial({
    color: COLOR_CONO, roughness: 0.25, transparent: true, opacity: 0.85, clearcoat: 1,
  });
  const vidrio = new MeshPhysicalMaterial({
    color: COLOR_JERINGA, roughness: 0.08, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false,
  });
  const sangre = new MeshPhysicalMaterial({ color: COLOR_SANGRE_VENOSA, roughness: 0.2, clearcoat: 0.8 });

  // Bisel + cuerpo de la aguja
  const bisel = new Mesh(new ConeGeometry(RADIO_AGUJA_MM, LARGO_BISEL_MM, SEGMENTOS), acero);
  bisel.rotation.x = Math.PI; // la punta hacia el origen
  bisel.position.y = LARGO_BISEL_MM / 2;
  const cuerpoLargo = LARGO_AGUJA_MM - LARGO_BISEL_MM;
  const cuerpo = new Mesh(new CylinderGeometry(RADIO_AGUJA_MM, RADIO_AGUJA_MM, cuerpoLargo, SEGMENTOS), acero);
  cuerpo.position.y = LARGO_BISEL_MM + cuerpoLargo / 2;
  // Cono (conector)
  const cono = new Mesh(new CylinderGeometry(3.2, 1.6, LARGO_CONO_MM, SEGMENTOS), plastico);
  cono.position.y = LARGO_AGUJA_MM + LARGO_CONO_MM / 2;
  // Jeringa con la sangre adentro
  const baseJeringa = LARGO_AGUJA_MM + LARGO_CONO_MM;
  const jeringa = new Mesh(new CylinderGeometry(RADIO_JERINGA_MM, RADIO_JERINGA_MM, LARGO_JERINGA_MM, SEGMENTOS, 1, true), vidrio);
  jeringa.position.y = baseJeringa + LARGO_JERINGA_MM / 2;
  const contenido = new Mesh(
    new CylinderGeometry(RADIO_JERINGA_MM - ESPESOR_PARED_JERINGA_MM, RADIO_JERINGA_MM - ESPESOR_PARED_JERINGA_MM, 1, SEGMENTOS),
    sangre,
  );
  contenido.visible = false;
  const embolo = new Mesh(new CylinderGeometry(RADIO_JERINGA_MM - 0.4, RADIO_JERINGA_MM - 0.4, 3, SEGMENTOS), plastico);
  for (const m of [bisel, cuerpo, cono, jeringa, embolo]) m.castShadow = true;
  grupo.add(bisel, cuerpo, cono, jeringa, contenido, embolo);

  const colorVenoso = new Color(COLOR_SANGRE_VENOSA);
  const colorArterial = new Color(COLOR_SANGRE_ARTERIAL);
  const largoUtil = LARGO_JERINGA_MM * 0.8;

  const llenar = (cantidad: number, tipo: 'vena' | 'arteria' | null): void => {
    // Al aspirar, el émbolo retrocede y la sangre ocupa ese espacio
    const largo = Math.max(cantidad * largoUtil, 0.01);
    contenido.visible = cantidad > 0 && tipo !== null;
    contenido.scale.y = largo;
    contenido.position.y = baseJeringa + largo / 2;
    embolo.position.y = baseJeringa + largo + 1.5 + 4;
    sangre.color.copy(tipo === 'arteria' ? colorArterial : colorVenoso);
  };
  llenar(0, null);
  let jeringaPuesta = true;
  const conJeringa = (visible: boolean): void => {
    if (visible === jeringaPuesta) return;
    jeringaPuesta = visible;
    jeringa.visible = embolo.visible = visible;
    if (!visible) contenido.visible = false;
  };
  return { grupo, llenar, conJeringa };
}

// Marca del punto de entrada elegido en la piel
export function crearMarcaEntrada(): Mesh {
  const marca = new Mesh(
    new RingGeometry(1.6, 2.6, 32),
    new MeshBasicMaterial({ color: COLOR_MARCA_ENTRADA, side: DoubleSide, transparent: true, opacity: 0.9 }),
  );
  return marca;
}

// ---------------------------------------------------------------------
// Guía, dilatador y catéter. Igual que la aguja: punta en el origen y el
// cuerpo hacia +y; se colocan sobre el trayecto de la aguja.
// ---------------------------------------------------------------------

export interface Herramienta {
  grupo: Group;
  // largo de la parte que queda fuera de la piel (mm)
  ajustarLargo: (largoMm: number) => void;
}

function tubo(radio: number, material: MeshPhysicalMaterial): { malla: Mesh; ajustar: (largo: number, desde: number) => void } {
  const malla = new Mesh(new CylinderGeometry(radio, radio, 1, SEGMENTOS), material);
  malla.castShadow = true;
  return {
    malla,
    ajustar: (largo, desde) => {
      malla.scale.y = Math.max(largo, 0.01);
      malla.position.y = desde + largo / 2;
    },
  };
}

export function crearGuia(): Herramienta {
  const grupo = new Group();
  const metal = new MeshPhysicalMaterial({ color: COLOR_GUIA_3D, metalness: 0.9, roughness: 0.25 });
  const t = tubo(RADIO_GUIA_MM, metal);
  grupo.add(t.malla);
  return { grupo, ajustarLargo: (largo) => t.ajustar(largo, 0) };
}

export function crearDilatador(): Herramienta {
  const grupo = new Group();
  const plastico = new MeshPhysicalMaterial({ color: COLOR_DILATADOR_3D, roughness: 0.3, clearcoat: 0.8 });
  const punta = new Mesh(new ConeGeometry(RADIO_DILATADOR_MM, 8, SEGMENTOS), plastico);
  punta.rotation.x = Math.PI;
  punta.position.y = 4;
  const cuerpo = tubo(RADIO_DILATADOR_MM, plastico);
  const cono = new Mesh(new CylinderGeometry(4, 2.5, 12, SEGMENTOS), plastico);
  grupo.add(punta, cuerpo.malla, cono);
  return {
    grupo,
    ajustarLargo: (largo) => {
      cuerpo.ajustar(Math.max(largo - 8, 0), 8);
      cono.position.y = largo + 6;
    },
  };
}

export function crearCateter(): Herramienta {
  const grupo = new Group();
  const blanco = new MeshPhysicalMaterial({ color: COLOR_CATETER_3D, roughness: 0.3, clearcoat: 0.6 });
  const azul = new MeshPhysicalMaterial({ color: COLOR_CONECTOR_CATETER_3D, roughness: 0.35, clearcoat: 0.6 });
  const cuerpo = tubo(RADIO_CATETER_MM, blanco);
  const conector = new Mesh(new CylinderGeometry(5, 5, 14, SEGMENTOS), azul);
  conector.castShadow = true;
  grupo.add(cuerpo.malla, conector);
  return {
    grupo,
    ajustarLargo: (largo) => {
      cuerpo.ajustar(largo, 0);
      conector.position.y = largo + 7;
    },
  };
}
