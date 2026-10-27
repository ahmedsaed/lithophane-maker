import { Matrix4, Vector3, type BufferGeometry } from 'three';
import { PANEL_SLOTS, type HeightMap, type Params, type PanelSlot, type PartId, type PartMesh } from './types';
import { cubeLayout, faceNormal, type CubeLayout } from './layout';
import { buildLithophanePanel } from './lithophanePanel';
import { centerCropHeightMap, downsampleHeightMap } from '../image/toHeightmap';
import { buildFrame } from './frame';
import { buildLidFrame } from './lidFrame';

/**
 * Stand-in image for an empty slot: flat mid-gray, so a blank panel is one even
 * thickness that glows about as brightly as an average photo panel.
 */
export const BLANK_HEIGHTMAP: HeightMap = { width: 1, height: 1, data: Float32Array.from([0.5]) };

/** Every slot's height map, with BLANK_HEIGHTMAP in the empty ones, plus which those were. */
export function fillBlankPanels(
  heightMaps: Partial<Record<PanelSlot, HeightMap>>,
): { heightMaps: Record<PanelSlot, HeightMap>; blankSlots: PanelSlot[] } {
  const filled = {} as Record<PanelSlot, HeightMap>;
  const blankSlots: PanelSlot[] = [];
  for (const slot of PANEL_SLOTS) {
    const hm = heightMaps[slot];
    if (hm) filled[slot] = hm;
    else {
      filled[slot] = BLANK_HEIGHTMAP;
      blankSlots.push(slot);
    }
  }
  return { heightMaps: filled, blankSlots };
}

/** STL file name for a panel; blank panels say so, so nobody prints one expecting a photo. */
export function panelFileName(slot: PanelSlot, blank: boolean): string {
  const base = slot === 'top' ? 'top' : `side-${slot}`;
  return `${base}${blank ? '-blank' : ''}.stl`;
}

function reliefSign(params: Params): 1 | -1 {
  return params.relief === 'outward' ? 1 : -1;
}

/**
 * Stand a plate built in local XY (image up = +Y) on its bottom edge, centred
 * on the bed at Z = 0. Lithophanes print best upright: thickness then comes
 * from the nozzle's XY moves instead of whole layers, so shading is smooth
 * rather than stepped, and the panel is built from walls with no infill grid.
 * A rigid rotation, so the panel itself (and its mirrored image) is unchanged.
 */
export function standUpright(geom: BufferGeometry): BufferGeometry {
  geom.rotateX(Math.PI / 2); // local +Y (image up) → +Z
  geom.computeBoundingBox();
  const b = geom.boundingBox!;
  geom.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/** Cell counts driven by mm/pixel, capped at the render resolution limit. */
function resolutionCells(
  panelW: number,
  panelH: number,
  pixelsPerMm: number,
  resolution: number,
): { cellsX: number; cellsY: number } {
  const tX = Math.max(1, Math.round(panelW * pixelsPerMm));
  const tY = Math.max(1, Math.round(panelH * pixelsPerMm));
  const scale = Math.min(1, resolution / Math.max(tX, tY));
  return {
    cellsX: Math.max(1, Math.round(tX * scale)),
    cellsY: Math.max(1, Math.round(tY * scale)),
  };
}

/**
 * Build a lithophane plate (centred, in local XY). Every panel, top included,
 * is the same square: the image fills the window and an `engage`-wide flat
 * border on every edge rides in the grooves.
 */
function buildPlate(
  hm: HeightMap,
  params: Params,
  L: CubeLayout,
  resolution: number,
  mirrorX: boolean,
): BufferGeometry {
  const size = L.sidePanelW;
  const cropped = centerCropHeightMap(hm, size, size);
  const { cellsX, cellsY } = resolutionCells(size, size, params.pixelsPerMm, resolution);
  const downsampled = downsampleHeightMap(cropped, cellsX, cellsY);
  const geom = buildLithophanePanel({
    width: size,
    height: size,
    thickness: L.t,
    tongueWidth: L.engage,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: downsampled,
    cellsX,
    cellsY,
    mirrorX,
    reliefSign: reliefSign(params),
    gamma: params.lithoGamma,
  });
  // Center the plate on its midplane. When reliefSign = -1 the geometry was
  // flipped to -Z, so the translate must flip too — otherwise the panel sits
  // one full thickness inward of where it should be.
  geom.translate(0, 0, (-L.t / 2) * reliefSign(params));
  return geom;
}

/** A side panel's plate. Mirrored for inward relief, which is viewed through the plate. */
function buildSidePlate(hm: HeightMap, params: Params, L: CubeLayout, resolution: number): BufferGeometry {
  return buildPlate(hm, params, L, resolution, params.relief === 'inward');
}

/**
 * The top panel's plate. Never mirrored: the viewer always looks straight down
 * at it, not through it from the far side.
 */
function buildTopPlate(hm: HeightMap, params: Params, L: CubeLayout, resolution: number): BufferGeometry {
  return buildPlate(hm, params, L, resolution, false);
}

/** A complete side part (lithophane plate) in local frame. */
export function buildSidePartLocal(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  return buildSidePlate(hm, params, L, resolution);
}

/** Top panel in print orientation: standing on an edge. */
export function buildTopPanelForPrint(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  return standUpright(buildTopPlate(hm, params, L, resolution));
}

/** Build a side panel already transformed into assembled cube coordinates. */
export function buildPanelInPlace(
  slot: PanelSlot,
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const local = buildSidePartLocal(hm, params, resolution);

  const n = new Vector3(...faceNormal(slot));
  const right = new Vector3().crossVectors(new Vector3(0, 0, 1), n).normalize();
  const m = new Matrix4().makeBasis(right, new Vector3(0, 0, 1), n.clone());
  m.setPosition(n.clone().multiplyScalar(L.panelOffset).setZ(L.sidePanelCenterZ));

  local.applyMatrix4(m);
  local.computeVertexNormals();
  local.computeBoundingBox();
  return local;
}

/** Top panel in assembled position: resting on the posts' corner supports, under the lid. */
export function buildTopPanelInPlace(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const geom = buildTopPlate(hm, params, L, resolution);
  geom.translate(0, 0, L.topPanelBase + L.t / 2);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/** Side panel in print orientation: standing on its bottom edge, image upright. */
export function buildPanelForPrint(
  slot: PanelSlot,
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  return standUpright(buildSidePartLocal(hm, params, resolution));
}

/** Build every available part in assembled position. */
export function buildAllParts(
  heightMaps: Partial<Record<PanelSlot, HeightMap>>,
  params: Params,
  resolution: number,
): PartMesh[] {
  const parts: PartMesh[] = [
    { id: 'frame', geometry: buildFrame(params) },
    { id: 'lid',   geometry: buildLidFrame(params) },
  ];
  (Object.keys(heightMaps) as PanelSlot[]).forEach((slot) => {
    const hm = heightMaps[slot];
    if (!hm) return;
    const geometry = slot === 'top'
      ? buildTopPanelInPlace(hm, params, resolution)
      : buildPanelInPlace(slot, hm, params, resolution);
    parts.push({ id: slot, geometry });
  });
  return parts;
}

/** Direction to push a part when showing the exploded assembly view. */
export function explodeVector(id: PartId): Vector3 {
  if (id === 'frame') return new Vector3(0, 0, 0);
  if (id === 'lid')   return new Vector3(0, 0, 2);   // lid lifts highest…
  if (id === 'top')   return new Vector3(0, 0, 1);   // …the top panel sits between
  return new Vector3(...faceNormal(id as PanelSlot));
}
