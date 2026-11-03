// Sonda lineal en 3D. Ejes locales: x = largo de la huella (+ = lado lateral),
// y = perpendicular a la piel, z = a lo largo del cuello. La marca va del lado
// medial, hacia la izquierda del operador, igual que el punto de la pantalla.

import {
  Group, Mesh, MeshPhysicalMaterial, BoxGeometry, TubeGeometry, CatmullRomCurve3, Vector3, SphereGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  COLOR_SONDA_CUERPO, COLOR_SONDA_CABEZAL, COLOR_MARCA_SONDA, COLOR_GEL,
  SONDA_HUELLA_LARGO_MM, SONDA_HUELLA_ANCHO_MM,
} from '../config/escena';

const SEGMENTOS_REDONDEO = 4;

function caja(ancho: number, alto: number, prof: number, radio: number, material: MeshPhysicalMaterial, y: number): Mesh {
  const m = new Mesh(new RoundedBoxGeometry(ancho, alto, prof, SEGMENTOS_REDONDEO, radio), material);
  m.position.y = y;
  m.castShadow = true;
  return m;
}

export function crearSonda(): Group {
  const sonda = new Group();
  const plastico = new MeshPhysicalMaterial({ color: COLOR_SONDA_CUERPO, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const cabezal = new MeshPhysicalMaterial({ color: COLOR_SONDA_CABEZAL, roughness: 0.5, clearcoat: 0.4 });
  const marca = new MeshPhysicalMaterial({ color: COLOR_MARCA_SONDA, emissive: COLOR_MARCA_SONDA, emissiveIntensity: 0.6 });

  const L = SONDA_HUELLA_LARGO_MM;
  const W = SONDA_HUELLA_ANCHO_MM;
  // Cabezal con la lente, que apoya en la piel
  sonda.add(caja(L + 2, 13, W + 3, 3, cabezal, 6.5));
  const lente = new Mesh(new BoxGeometry(L - 2, 1.2, W - 1), cabezal);
  lente.position.y = 0.6;
  sonda.add(lente);
  // Cuello y mango, que se angostan hacia arriba
  sonda.add(caja(L - 6, 16, W + 6, 6, plastico, 20));
  const mango = caja(26, 64, 19, 8, plastico, 58);
  sonda.add(mango);
  // Marca de orientación del lado medial (corresponde al punto en la pantalla)
  const muesca = new Mesh(new BoxGeometry(2.4, 9, 4), marca);
  muesca.position.set(-(L / 2 - 1), 16, 0);
  sonda.add(muesca);
  // Cable
  const curva = new CatmullRomCurve3([
    new Vector3(0, 88, 0), new Vector3(0, 110, -8), new Vector3(-10, 140, -40), new Vector3(-30, 160, -120),
  ]);
  const cable = new Mesh(new TubeGeometry(curva, 40, 3.6, 10), cabezal);
  cable.castShadow = true;
  sonda.add(cable);
  return sonda;
}

// Gel bajo la sonda: una gota aplastada y brillante.
export function crearGel(): Mesh {
  const material = new MeshPhysicalMaterial({
    color: COLOR_GEL, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.45,
  });
  const gel = new Mesh(new SphereGeometry(1, 32, 12), material);
  gel.scale.set(SONDA_HUELLA_LARGO_MM * 0.62, 1.4, SONDA_HUELLA_ANCHO_MM * 1.2);
  return gel;
}
