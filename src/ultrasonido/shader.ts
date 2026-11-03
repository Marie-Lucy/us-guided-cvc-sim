// Shader de la imagen de ultrasonido. Cada pixel calcula, en milímetros:
//   1. qué tejido hay ahí y cuánto eco devuelve (reflectividad),
//   2. el granulado (speckle) como suma coherente de dispersores,
//   3. las interfaces brillantes (paredes, fascias, pleura),
//   4. la atenuación acumulada en el camino del haz (y el refuerzo detrás de los vasos),
//   5. la compresión logarítmica a grises, como hace un ecógrafo.
// Todas las constantes vienen de config/ultrasonido.ts.

import * as C from '../config/ultrasonido';
import * as A from '../config/aguja';
import * as P from '../config/procedimiento';

// GLSL necesita que los números con decimales tengan punto.
const f = (v: number): string => (Number.isInteger(v) ? v.toFixed(1) : String(v));

const DEFINES = `
#define PI 3.141592653589793
#define LONGITUD_ONDA ${f(C.LONGITUD_ONDA_MM)}
#define CELDA vec2(${f(C.CELDA_DISPERSOR_X_MM)}, ${f(C.CELDA_DISPERSOR_Y_MM)})
#define VX ${C.VECINDAD_X_CELDAS}
#define VY ${C.VECINDAD_Y_CELDAS}
#define SIGMA_LAT ${f(C.SIGMA_LATERAL_FOCO_MM)}
#define DESENFOQUE ${f(C.DESENFOQUE_POR_MM)}
#define SIGMA_AX ${f(C.SIGMA_AXIAL_MM)}
#define GROSOR_CORTE ${f(C.GROSOR_CORTE_MM)}
#define MEDIA_RAYLEIGH ${f(C.MEDIA_RAYLEIGH)}
#define VISTAS ${C.VISTAS_COMPUESTAS}

#define R_TEJIDO ${f(C.R_TEJIDO)}
#define VARIACION_TEJIDO ${f(C.VARIACION_TEJIDO)}
#define ESCALA_VARIACION ${f(C.ESCALA_VARIACION_MM)}
#define ESTRIAS vec2(${f(C.ESTRIAS_LARGO_MM)}, ${f(C.ESTRIAS_ALTO_MM)})
#define ESTRIAS_NITIDEZ ${f(C.ESTRIAS_NITIDEZ)}
#define ESTRIAS_BRILLO ${f(C.ESTRIAS_BRILLO)}
#define DEFORMACION ${f(C.DEFORMACION_SEPTOS_MM)}
#define ESCALA_DEFORMACION ${f(C.ESCALA_DEFORMACION_MM)}
#define R_GRASA ${f(C.R_GRASA)}
#define R_SEPTOS_GRASA ${f(C.R_SEPTOS_GRASA)}
#define SEPTOS_GRASA vec2(${f(C.SEPTOS_GRASA_X_MM)}, ${f(C.SEPTOS_GRASA_Y_MM)})
#define NITIDEZ_GRASA ${f(C.NITIDEZ_SEPTOS_GRASA)}
#define R_MUSCULO ${f(C.R_MUSCULO)}
#define R_MOTAS_MUSCULO ${f(C.R_MOTAS_MUSCULO)}
#define MOTAS_MUSCULO vec2(${f(C.MOTAS_MUSCULO_X_MM)}, ${f(C.MOTAS_MUSCULO_Y_MM)})
#define NITIDEZ_MOTAS ${f(C.NITIDEZ_MOTAS_MUSCULO)}
#define R_TIROIDES ${f(C.R_TIROIDES)}
#define R_SANGRE ${f(C.R_SANGRE)}
#define R_TROMBO ${f(C.R_TROMBO)}
#define VARIACION_TROMBO ${f(C.VARIACION_TROMBO)}
#define ESCALA_TROMBO ${f(C.ESCALA_VARIACION_TROMBO_MM)}

#define EXP_ESPECULAR ${f(C.EXPONENTE_ESPECULAR)}
#define DIFUSA_PARED ${f(C.FRACCION_DIFUSA_PARED)}
#define PARED_VENA ${f(C.GROSOR_PARED_VENA_MM)}
#define BRILLO_VENA ${f(C.BRILLO_PARED_VENA)}
#define PARED_ARTERIA ${f(C.GROSOR_PARED_ARTERIA_MM)}
#define BRILLO_ARTERIA ${f(C.BRILLO_PARED_ARTERIA)}
#define SEP_INTIMA ${f(C.SEPARACION_INTIMA_ADVENTICIA_MM)}
#define FASCIA ${f(C.GROSOR_FASCIA_MM)}
#define BRILLO_FASCIA ${f(C.BRILLO_FASCIA)}
#define BRILLO_CAPSULA ${f(C.BRILLO_CAPSULA_TIROIDES)}
#define BRILLO_FASCIA_SUP ${f(C.BRILLO_FASCIA_SUPERFICIAL)}

#define GROSOR_PLEURA ${f(C.GROSOR_PLEURA_MM)}
#define BRILLO_PLEURA ${f(C.BRILLO_PLEURA)}
#define LINEAS_A ${C.NUMERO_LINEAS_A}
#define DECAIMIENTO_A ${f(C.DECAIMIENTO_LINEAS_A)}
#define R_PULMON ${f(C.R_PULMON)}
#define ALCANCE_REVERB ${f(C.ALCANCE_REVERBERACION_MM)}
#define DESLIZAMIENTO ${f(C.DESLIZAMIENTO_PLEURAL_MM)}

#define ATEN_TEJIDO ${f(C.ATENUACION_TEJIDO_DB_MM)}
#define ATEN_SANGRE ${f(C.ATENUACION_SANGRE_DB_MM)}
#define TGC ${f(C.COMPENSACION_PROFUNDIDAD_DB_MM)}
#define SOMBRA ${f(C.INTENSIDAD_SOMBRA_BORDE)}
#define ANCHO_SOMBRA ${f(C.ANCHO_SOMBRA_BORDE_MM)}
#define ALCANCE_SOMBRA ${f(C.ALCANCE_SOMBRA_BORDE_MM)}
#define BRILLO_CERCANO ${f(C.BRILLO_CAMPO_CERCANO)}
#define ALCANCE_CERCANO ${f(C.ALCANCE_CAMPO_CERCANO_MM)}
#define RUIDO ${f(C.RUIDO_ELECTRONICO)}
#define CAIDA_BORDE ${f(C.CAIDA_BORDE_LATERAL)}
#define ANCHO_CAIDA ${f(C.ANCHO_CAIDA_BORDE_MM)}

#define DOP_SEMIANCHO ${f(C.DOPPLER_SEMIANCHO_MM)}
#define DOP_ARRIBA ${f(C.DOPPLER_ARRIBA_MM)}
#define DOP_ABAJO ${f(C.DOPPLER_ABAJO_MM)}
#define DOP_BLOQUE ${f(C.DOPPLER_BLOQUE_MM)}
#define DOP_CUADROS ${f(C.DOPPLER_CUADROS_POR_S)}
#define DOP_DIASTOLE ${f(C.DOPPLER_VELOCIDAD_DIASTOLICA)}
#define DOP_VENA ${f(C.DOPPLER_VELOCIDAD_VENOSA)}
#define DOP_UMBRAL ${f(C.DOPPLER_UMBRAL)}
#define DOP_ALIASING ${f(C.DOPPLER_ALIASING)}
#define DOP_VARIACION ${f(C.DOPPLER_VARIACION)}

#define MUESTRAS_EJE_LARGO ${f(C.MUESTRAS_EJE_LARGO)}
#define FILAS_EJE_LARGO ${f(C.FILAS_EJE_LARGO)}
#define POSICION_EN_LUZ ${f(P.POSICION_EN_LUZ)}
#define RADIO_HUECO ${f(P.RADIO_GUIA_MM * 2)}
#define PARED_HUECO ${f(P.PARED_HUECO_MM)}
#define MITAD_GROSOR_HAZ ${f(A.MITAD_GROSOR_HAZ_MM)}
#define COLA_REPETICIONES ${A.COLA_AGUJA_REPETICIONES}
#define COLA_SEPARACION ${f(A.COLA_AGUJA_SEPARACION_MM)}
#define COLA_DECAIMIENTO ${f(A.COLA_AGUJA_DECAIMIENTO)}
#define SOMBRA_AGUJA ${f(A.SOMBRA_AGUJA)}
#define GROSOR_COLA ${f(A.GROSOR_LINEA_COLA_MM)}

#define PISO_DB ${f(C.PISO_DB)}
#define RANGO_DB ${f(C.RANGO_DINAMICO_DB)}
#define GAMMA ${f(C.GAMMA_GRISES)}
`;

export const VERTEX_SHADER = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
${DEFINES}
uniform vec2 uResolucion;
uniform float uEscala;
uniform float uIzquierda;
uniform float uAnchoMm;
uniform float uProfundidadMm;
uniform float uGananciaDb;
uniform float uFocoMm;
uniform float uPosicionSonda;
uniform float uLateralMm;
uniform float uRespiracion;
uniform float uSubcutaneoMm;
uniform vec4 uVena;
uniform vec4 uArteria;
uniform vec4 uEcm0;
uniform vec4 uEcm1;
uniform vec4 uTiroides;
uniform float uHayTiroides;
uniform float uTrombo; // fracción de la vena ocupada por trombo (transversal)
uniform vec3 uPleura; // profundidad en el vértice, x del vértice, curvatura
uniform float uDoppler;
uniform float uPulso;
uniform float uFlujoVena;
uniform float uTiempo;
uniform float uInstrumento; // 1 = aguja, guía, dilatador o catéter cruza el haz
uniform vec2 uInstrumentoA; // tramo dentro del haz (mm de la imagen)
uniform vec2 uInstrumentoB;
uniform vec2 uInstrumentoForma; // radio (mm), brillo
uniform vec3 uTiendaVena; // x, hundimiento, ancho (mm) de la pared empujada por la punta
uniform vec3 uTiendaArteria;
uniform float uDispositivo; // guía o catéter en la luz: 0 nada, 1 vena, 2 arteria
uniform vec4 uDispositivoTramo; // desde z, hasta z, radio, brillo
uniform float uLongitudinal; // 1 = sonda girada (eje largo)
uniform sampler2D uCortes; // anatomía por columna en eje largo

// Anatomía del corte que se está dibujando. En transversal es la misma para todo
// el cuadro; en eje largo cambia de columna en columna.
vec4 gVena;
vec4 gArteria;
vec4 gEcm0;
vec4 gEcm1;
vec4 gTiroides;
float gHayTiroides;
float gTrombo;
vec3 gPleura;
float gSubcutaneo;

// ------------------------------------------------------------------
// Azar estable: el mismo punto da siempre el mismo valor
// (hash sin senos de Dave Hoskins)
// ------------------------------------------------------------------
vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float hash13(vec3 p) { return hash33(p).x; }

// Ruido suave a gran escala (para que el tejido no sea uniforme)
float ruidoSuave(vec2 p) {
  vec2 i = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  float a = hash13(vec3(i, 7.0));
  float b = hash13(vec3(i + vec2(1.0, 0.0), 7.0));
  float c = hash13(vec3(i + vec2(0.0, 1.0), 7.0));
  float d = hash13(vec3(i + vec2(1.0, 1.0), 7.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// ------------------------------------------------------------------
// Speckle: suma coherente de los ecos de los dispersores cercanos.
// Devuelve el campo complejo y la energía esperada (para normalizar).
// ------------------------------------------------------------------
vec3 campoDispersores(vec2 p, float capa, float sigmaX) {
  vec2 celda = floor(p / CELDA);
  vec2 suma = vec2(0.0);
  float energia = 0.0;
  for (int j = -VY; j <= VY; j++) {
    for (int i = -VX; i <= VX; i++) {
      vec2 c = celda + vec2(float(i), float(j));
      vec3 h = hash33(vec3(c, capa));
      vec2 d = p - (c + h.xy) * CELDA;
      float envolvente = exp(-0.5 * (d.x * d.x / (sigmaX * sigmaX) + d.y * d.y / (SIGMA_AX * SIGMA_AX)));
      // Ida y vuelta: la fase avanza 2 × 2π por cada longitud de onda de distancia axial
      float fase = 4.0 * PI * d.y / LONGITUD_ONDA;
      suma += h.z * envolvente * vec2(cos(fase), sin(fase));
      energia += envolvente * envolvente;
    }
  }
  return vec3(suma, energia / 3.0); // E[h.z²] = 1/3
}

// Amplitud del speckle de una vista, con media ≈ 1. Al mover la sonda a lo largo
// del cuello se mezclan dos capas de dispersores, así el patrón cambia de forma gradual.
float speckleVista(vec2 p, float posicion, float sigmaX, float semilla) {
  float capa = posicion / GROSOR_CORTE;
  float base = floor(capa);
  float t = capa - base;
  vec3 a = campoDispersores(p, base + semilla, sigmaX);
  vec3 b = campoDispersores(p, base + 1.0 + semilla, sigmaX);
  vec2 campo = mix(a.xy, b.xy, t);
  // Las dos capas son independientes: sus energías se suman con peso (1−t)² y t²
  float norma = sqrt(max((1.0 - t) * (1.0 - t) * a.z + t * t * b.z, 1e-6));
  return length(campo) / norma / MEDIA_RAYLEIGH;
}

// Imagen compuesta: promedio de vistas con speckle independiente.
float speckle(vec2 p, float posicion, float sigmaX, float semilla) {
  float suma = 0.0;
  for (int v = 0; v < VISTAS; v++) suma += speckleVista(p, posicion, sigmaX, semilla + float(v) * 97.0);
  return suma / float(VISTAS);
}

// ------------------------------------------------------------------
// Geometría de las estructuras
// ------------------------------------------------------------------

// Distancia aproximada (mm) al borde de una elipse; negativa adentro.
// n devuelve la normal del borde (para la reflexión especular).
float distanciaElipse(vec2 p, vec4 e, out vec2 n) {
  vec2 q = (p - e.xy) / e.zw;
  float fq = max(length(q), 1e-4);
  vec2 g = q / (e.zw * fq);
  float lg = max(length(g), 1e-4);
  n = g / lg;
  return (fq - 1.0) / lg;
}

// Cuánto del camino vertical desde la piel hasta p va dentro de la elipse (mm).
float cuerdaSobre(vec2 p, vec4 e) {
  float u = (p.x - e.x) / e.z;
  if (abs(u) >= 1.0) return 0.0;
  float mitad = e.w * sqrt(1.0 - u * u);
  float arriba = e.y - mitad;
  return clamp(p.y, arriba, e.y + mitad) - arriba;
}

// Perfil de una línea brillante centrada en 'centro' con cierto grosor.
float linea(float d, float centro, float grosor) {
  float z = (d - centro) / grosor;
  return exp(-z * z);
}

// Brillo de la pared de un vaso: más fuerte donde el haz la golpea de frente.
float especular(vec2 n) {
  return DIFUSA_PARED + (1.0 - DIFUSA_PARED) * pow(abs(n.y), EXP_ESPECULAR);
}

float profundidadPleura(float x) {
  float dx = x - gPleura.y;
  return gPleura.x + gPleura.z * dx * dx;
}

// Tienda: la punta empuja la pared anterior hacia abajo antes de perforarla.
// Se "mueve" el punto hacia arriba cerca de la punta; el piso del vaso no se mueve.
// xImagen: posición horizontal en la imagen (en eje largo no es la x anatómica).
vec2 hundirPared(vec2 p, float xImagen, vec4 e, vec3 tienda) {
  if (tienda.y <= 0.0) return p;
  float dx = (xImagen - tienda.x) / tienda.z;
  float caida = tienda.y * exp(-dx * dx) * (1.0 - smoothstep(e.y - e.w, e.y + e.w, p.y));
  return vec2(p.x, p.y - caida);
}

// ¿El punto está dentro del trombo? Se apoya en la pared posterior de la vena y
// sube hasta ocupar la fracción gTrombo de la altura local (igual que anatomia.ts).
bool enTrombo(vec2 p, vec4 e) {
  if (gTrombo <= 0.0) return false;
  float u = (p.x - e.x) / e.z;
  if (abs(u) >= 1.0) return false;
  float mitad = e.w * sqrt(1.0 - u * u);
  float fondo = e.y + mitad;
  return p.y <= fondo && p.y >= fondo - gTrombo * 2.0 * mitad;
}

// ------------------------------------------------------------------
// Reflectividad del tejido (lo que se multiplica por el speckle)
// ------------------------------------------------------------------
// Desplaza un punto con ruido suave: los septos quedan ondulados e irregulares
vec2 deformar(vec2 pa) {
  vec2 q = pa / ESCALA_DEFORMACION;
  return pa + DEFORMACION * (vec2(ruidoSuave(q), ruidoSuave(q + 17.3)) - 0.5) * 2.0;
}

float reflectividad(vec2 p, vec2 pa, vec2 pV, vec2 pA) {
  vec2 n;
  // Tejido conectivo de fondo, con variaciones suaves y planos fasciales tenues
  float r = R_TEJIDO * (1.0 + VARIACION_TEJIDO * (ruidoSuave(pa / ESCALA_VARIACION) - 0.5) * 2.0);
  r *= 1.0 + ESTRIAS_BRILLO * pow(ruidoSuave(deformar(pa) / ESTRIAS), ESTRIAS_NITIDEZ);

  // Subcutáneo: grasa oscura con septos finos y horizontales
  if (p.y < gSubcutaneo) {
    float septo = pow(ruidoSuave(deformar(pa) / SEPTOS_GRASA), NITIDEZ_GRASA);
    r = mix(R_GRASA, R_SEPTOS_GRASA, septo);
  }

  // Tiroides
  if (gHayTiroides > 0.5 && distanciaElipse(p, gTiroides, n) < 0.0) r = R_TIROIDES;

  // Esternocleidomastoideo: fascículos oscuros cortados de través, con motas
  // brillantes cortas del tejido conectivo entre ellos
  if (distanciaElipse(p, gEcm0, n) < 0.0 || distanciaElipse(p, gEcm1, n) < 0.0) {
    float mota = pow(ruidoSuave(deformar(pa) / MOTAS_MUSCULO + 31.0), NITIDEZ_MOTAS);
    r = mix(R_MUSCULO, R_MOTAS_MUSCULO, mota);
  }

  // Sangre: casi sin eco
  if (distanciaElipse(pV, gVena, n) < 0.0 || distanciaElipse(pA, gArteria, n) < 0.0) r = R_SANGRE;
  // Trombo: material gris y heterogéneo dentro de la luz
  if (distanciaElipse(pV, gVena, n) < 0.0 && enTrombo(pV, gVena)) {
    r = R_TROMBO * (1.0 + VARIACION_TROMBO * (ruidoSuave(pa / ESCALA_TROMBO + 53.0) - 0.5) * 2.0);
  }
  return r;
}

// Interfaces brillantes: paredes, fascias, cápsula
float interfaces(vec2 p, vec2 pV, vec2 pA) {
  vec2 n;
  float total = 0.0;

  // Fascia cervical superficial, bajo el subcutáneo
  total += BRILLO_FASCIA_SUP * linea(p.y, gSubcutaneo, FASCIA);

  // Fascia del ECM: solo el contorno exterior (cuando los dos haces se juntan,
  // el borde de uno que queda dentro del otro no se ve)
  vec2 n1;
  float d0 = distanciaElipse(p, gEcm0, n);
  float d1 = distanciaElipse(p, gEcm1, n1);
  total += BRILLO_FASCIA * especular(n) * linea(d0, 0.0, FASCIA) * smoothstep(-FASCIA, FASCIA, d1);
  total += BRILLO_FASCIA * especular(n1) * linea(d1, 0.0, FASCIA) * smoothstep(-FASCIA, FASCIA, d0);
  float d;

  if (gHayTiroides > 0.5) {
    d = distanciaElipse(p, gTiroides, n);
    total += BRILLO_CAPSULA * especular(n) * linea(d, 0.0, FASCIA);
  }

  // Vena: pared fina
  d = distanciaElipse(pV, gVena, n);
  total += BRILLO_VENA * especular(n) * linea(d, PARED_VENA * 0.5, PARED_VENA);

  // Arteria: pared gruesa con doble línea (íntima y adventicia)
  d = distanciaElipse(pA, gArteria, n);
  float doble = linea(d, PARED_ARTERIA * 0.5, PARED_ARTERIA) + 0.8 * linea(d, SEP_INTIMA, PARED_ARTERIA);
  total += BRILLO_ARTERIA * especular(n) * doble;
  return total;
}

// Sombras finas bajo los bordes laterales de los vasos (refracción)
float sombraBordes(vec2 p, vec4 e) {
  float lado = abs(p.x - e.x) - e.z;
  float debajo = smoothstep(e.y, e.y + e.w, p.y) * exp(-max(p.y - e.y - e.w, 0.0) / ALCANCE_SOMBRA);
  return 1.0 - SOMBRA * debajo * exp(-(lado * lado) / (ANCHO_SOMBRA * ANCHO_SOMBRA));
}

// ------------------------------------------------------------------
// Doppler color
// ------------------------------------------------------------------

// Velocidad con perfil parabólico: máxima en el centro del vaso, cero en la pared.
float velocidadEn(vec2 p, vec4 e, float vCentro) {
  vec2 q = (p - e.xy) / e.zw;
  float r2 = dot(q, q);
  return r2 < 1.0 ? vCentro * (1.0 - r2) : 0.0;
}

// Rojo = hacia la sonda (arteria), azul = alejándose (vena). Más rápido = más claro.
// Pasado el límite de la escala, el color se da vuelta (aliasing).
vec3 colorFlujo(float v, bool arterial) {
  vec3 lento = arterial ? vec3(0.55, 0.02, 0.02) : vec3(0.02, 0.08, 0.6);
  vec3 rapido = arterial ? vec3(1.0, 0.85, 0.25) : vec3(0.35, 0.85, 1.0);
  if (v > DOP_ALIASING) {
    float exceso = (v - DOP_ALIASING) / (1.0 - DOP_ALIASING + 0.2);
    return arterial ? mix(vec3(0.3, 0.9, 1.0), vec3(0.05, 0.2, 0.8), exceso)
                    : mix(vec3(1.0, 0.9, 0.3), vec3(0.8, 0.1, 0.05), exceso);
  }
  return mix(lento, rapido, smoothstep(0.0, DOP_ALIASING, v));
}

// pi: punto en la imagen; p: punto donde se evalúa la anatomía (en eje largo x = 0)
vec3 doppler(vec2 pi, vec2 p, vec3 gris) {
  if (abs(pi.x) > DOP_SEMIANCHO || pi.y < DOP_ARRIBA || pi.y > DOP_ABAJO) return gris;
  vec2 celda = floor(pi / DOP_BLOQUE);
  vec2 centroBloque = (celda + 0.5) * DOP_BLOQUE;
  vec2 bloque = uLongitudinal > 0.5 ? vec2(p.x, centroBloque.y) : centroBloque;
  float ruido = hash13(vec3(celda, floor(uTiempo * DOP_CUADROS)));
  float variacion = 1.0 + DOP_VARIACION * (ruido - 0.5) * 2.0;

  float vArteria = velocidadEn(bloque, gArteria, DOP_DIASTOLE + (1.0 - DOP_DIASTOLE) * uPulso) * variacion;
  if (vArteria > DOP_UMBRAL) return colorFlujo(vArteria, true);
  // Sin flujo dentro del trombo; un trombo parcial también reduce el flujo del resto
  float vVena = enTrombo(bloque, gVena) ? 0.0 : velocidadEn(bloque, gVena, DOP_VENA * uFlujoVena * (1.0 - gTrombo)) * variacion;
  if (vVena > DOP_UMBRAL) return colorFlujo(vVena, false);
  return gris;
}

// ------------------------------------------------------------------
// Aguja: el tramo que cruza el haz se ve como un punto (o línea) muy brillante,
// con reverberaciones debajo ("cola de cometa") y una sombra tenue.
// ------------------------------------------------------------------
float distanciaSegmento(vec2 p, vec2 a, vec2 b, out vec2 q) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  q = a + t * ab;
  return length(p - q);
}

// Perfiles con borde nítido. Una gaussiana, con la compresión logarítmica,
// se vería como un halo enorme; el metal y el plástico tienen bordes netos.
float perfilSolido(float d, float r) { return 1.0 - smoothstep(r * 0.55, r, d); }
// Hueco (dilatador, catéter): solo brillan las dos paredes
float perfilHueco(float d, float r) { return 1.0 - smoothstep(0.0, PARED_HUECO, abs(d - r)); }
float perfil(float d, float r) { return r > RADIO_HUECO ? perfilHueco(d, r) : perfilSolido(d, r); }

float instrumento(vec2 p, inout float amplitud) {
  vec2 a = uInstrumentoA;
  vec2 b = uInstrumentoB;
  vec2 q;
  float d = distanciaSegmento(p, a, b, q);
  float r = uInstrumentoForma.x;
  float brilloBase = uInstrumentoForma.y;

  // Debajo del instrumento: distancia vertical y "columna" que ocupa.
  // En plano (tramo largo) se mide contra la línea a la misma x, así las
  // reverberaciones salen paralelas a todo el cuerpo; fuera de plano (un punto),
  // contra el punto más cercano.
  float dy;
  float columna;
  vec2 ab = b - a;
  if (abs(ab.x) > r) {
    float t = clamp((p.x - a.x) / ab.x, 0.0, 1.0);
    dy = p.y - (a.y + t * ab.y);
    float fuera = max(max(min(a.x, b.x) - p.x, p.x - max(a.x, b.x)), 0.0);
    columna = exp(-(fuera * fuera) / (r * r));
  } else {
    dy = p.y - q.y;
    float dx = (p.x - q.x) / r;
    columna = exp(-dx * dx);
  }

  // Sombra bajo el instrumento: el metal o el plástico grueso dejan pasar poco
  if (dy > r) amplitud *= 1.0 - SOMBRA_AGUJA * columna;
  float brillo = brilloBase * perfil(d, r);
  if (dy > 0.0) {
    float eco = brilloBase;
    for (int k = 1; k <= COLA_REPETICIONES; k++) {
      eco *= COLA_DECAIMIENTO;
      float z = (dy - r - float(k) * COLA_SEPARACION) / GROSOR_COLA;
      brillo += eco * columna * exp(-z * z);
    }
  }
  return brillo;
}

// Guía o catéter dentro de la luz, por su parte posterior.
// En transversal es un punto; en eje largo, una línea a lo largo del vaso.
float dispositivoEnLuz(vec2 p, float zCorte) {
  if (uDispositivo < 0.5 || zCorte < uDispositivoTramo.x || zCorte > uDispositivoTramo.y) return 0.0;
  vec4 e = uDispositivo < 1.5 ? gVena : gArteria;
  vec2 centro = vec2(e.x, e.y + POSICION_EN_LUZ * e.w);
  float r = uDispositivoTramo.z;
  if (uLongitudinal > 0.5) {
    // En eje largo se ve si cae dentro del grosor del haz (la lámina ±MITAD_GROSOR_HAZ)
    float enLamina = 1.0 - smoothstep(MITAD_GROSOR_HAZ, MITAD_GROSOR_HAZ + r, abs(centro.x));
    return uDispositivoTramo.w * enLamina * perfil(abs(p.y - centro.y), r);
  }
  return uDispositivoTramo.w * perfil(length(p - centro), r);
}

// Carga la anatomía de una columna del eje largo (textura: una fila por estructura).
vec4 fila(float u, float f) {
  return texture2D(uCortes, vec2(u, (f + 0.5) / FILAS_EJE_LARGO));
}

void cargarCorte(float x) {
  if (uLongitudinal > 0.5) {
    float u = (uAnchoMm * 0.5 - x) / uAnchoMm;
    gVena = fila(u, 0.0);
    gArteria = fila(u, 1.0);
    gEcm0 = fila(u, 2.0);
    gEcm1 = fila(u, 3.0);
    gTiroides = fila(u, 4.0);
    vec4 extra = fila(u, 5.0);
    gPleura = extra.xyz;
    gSubcutaneo = extra.w;
    vec4 marcas = fila(u, 6.0);
    gHayTiroides = marcas.x;
    gTrombo = marcas.y;
  } else {
    gVena = uVena;
    gArteria = uArteria;
    gEcm0 = uEcm0;
    gEcm1 = uEcm1;
    gTiroides = uTiroides;
    gHayTiroides = uHayTiroides;
    gTrombo = uTrombo;
    gPleura = uPleura;
    gSubcutaneo = uSubcutaneoMm;
  }
}

void main() {
  // Pixel → mm (y hacia abajo desde la piel)
  vec2 px = vec2(gl_FragCoord.x, uResolucion.y - gl_FragCoord.y);
  // Izquierda de la pantalla = medial (x positivo del modelo), como en vista.ts
  float x = uAnchoMm * 0.5 - (px.x - uIzquierda) / uEscala;
  float y = px.y / uEscala;
  if (abs(x) > uAnchoMm * 0.5 || y > uProfundidadMm) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  cargarCorte(x);
  bool largo = uLongitudinal > 0.5;
  // pi: punto en la imagen. p: dónde se evalúa la anatomía.
  // Transversal: son el mismo. Eje largo: cada columna es un corte a otra altura,
  // evaluado justo bajo la línea de la sonda (x = 0).
  vec2 pi = vec2(x, y);
  vec2 p = largo ? vec2(0.0, y) : pi;
  float zCorte = largo ? uPosicionSonda + x : uPosicionSonda;
  // Coordenadas pegadas al paciente (no a la sonda) para el speckle, y la
  // coordenada fuera del plano, que decide qué capa de dispersores se ve
  vec2 pa = largo ? vec2(zCorte, y) : vec2(x + uLateralMm, y);
  float fueraDePlano = largo ? uLateralMm : uPosicionSonda;
  vec2 pV = hundirPared(p, x, gVena, uTiendaVena);
  vec2 pA = hundirPared(p, x, gArteria, uTiendaArteria);

  // El haz es más fino en la zona focal
  float sigmaX = SIGMA_LAT * (1.0 + DESENFOQUE * abs(y - uFocoMm));
  float granulado = speckle(pa, fueraDePlano, sigmaX, 0.0);

  float dp = y - profundidadPleura(p.x);
  float amplitud;

  if (dp > GROSOR_PLEURA) {
    // Pulmón: el aire refleja todo. Debajo de la pleura solo hay reverberaciones
    // que se mueven con la respiración, y las líneas A a múltiplos de la profundidad pleural.
    vec2 pd = pa + vec2(uRespiracion * DESLIZAMIENTO, 0.0);
    float granuloPulmon = speckle(pd, fueraDePlano, sigmaX, 500.0);
    amplitud = R_PULMON * granuloPulmon * exp(-dp / ALCANCE_REVERB);
    float profP = profundidadPleura(p.x);
    float brillo = BRILLO_PLEURA;
    for (int k = 2; k <= LINEAS_A + 1; k++) {
      brillo *= DECAIMIENTO_A;
      amplitud += brillo * linea(y, float(k) * profP, GROSOR_PLEURA * 1.5) * (0.5 + 0.5 * granuloPulmon);
    }
  } else {
    amplitud = reflectividad(p, pa, pV, pA) * granulado + interfaces(p, pV, pA) * (0.55 + 0.45 * granulado);
  }

  // Línea pleural, con brillo que "centellea" al deslizarse
  if (dp > -2.0 * GROSOR_PLEURA) {
    float centelleo = speckle(pa + vec2(uRespiracion * DESLIZAMIENTO, 0.0), fueraDePlano, sigmaX, 500.0);
    amplitud += BRILLO_PLEURA * linea(dp, 0.0, GROSOR_PLEURA) * (0.6 + 0.4 * centelleo);
  }

  // Reverberación justo bajo la piel
  amplitud += BRILLO_CERCANO * exp(-y / ALCANCE_CERCANO) * (0.5 + 0.5 * granulado);

  amplitud *= sombraBordes(p, gVena) * sombraBordes(p, gArteria);

  // El haz pierde fuerza en los extremos de la sonda
  float borde = uAnchoMm * 0.5 - abs(x);
  amplitud *= 1.0 - CAIDA_BORDE * (1.0 - smoothstep(0.0, ANCHO_CAIDA, borde));

  amplitud += RUIDO * hash13(vec3(pa * 41.0, 3.0));

  amplitud += dispositivoEnLuz(p, zCorte);
  if (uInstrumento > 0.5) amplitud += instrumento(pi, amplitud);

  // Atenuación: el tejido atenúa, la sangre casi no → detrás de los vasos
  // llega más señal (refuerzo acústico posterior).
  // El trombo atenúa como tejido: detrás de una vena trombosada no hay refuerzo posterior
  float sangre = cuerdaSobre(pV, gVena) * (1.0 - gTrombo) + cuerdaSobre(pA, gArteria);
  float atenuacionDb = ATEN_TEJIDO * (y - sangre) + ATEN_SANGRE * sangre;

  float db = 20.0 * log(max(amplitud, 1e-6)) / log(10.0) + uGananciaDb + TGC * y - atenuacionDb;
  float gris = pow(clamp((db - PISO_DB) / RANGO_DB, 0.0, 1.0), GAMMA);
  vec3 color = vec3(gris);
  if (uDoppler > 0.5) color = doppler(pi, p, color);
  gl_FragColor = vec4(color, 1.0);
}
`;
