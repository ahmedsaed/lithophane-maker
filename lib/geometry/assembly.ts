import { Matrix4, Vector3, type BufferGeometry } from 'three';
import { PANEL_SLOTS, type HeightMap, type Params, type PanelSlot, type PartId, type PartMesh } from './types';
import { cubeLayout, faceNormal, type CubeLayout } from './layout';
import { buildLithophanePanel } from './lithophanePanel';
import { centerCropHeightMap, downsampleHeightMap } from '../image/toHeightmap';
import { buildFrame } from './frame';
import { buildLidFrame } from './lidFrame';
import { geometryToManifold, manifoldToGeometry, mBox, mSubtract, mUnionAll, withManifoldScope } from './mCsg';

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
 * Turn a plate built with its relief on −Z (inward relief) over, so every
 * exported panel prints flat side down with the relief facing up. A rigid
 * rotation, so the panel itself — and its mirrored image — is unchanged.
 */
function reliefUp(geom: BufferGeometry, params: Params): BufferGeometry {
  if (reliefSign(params) < 0) {
    geom.rotateX(Math.PI);
    geom.computeVertexNormals();
    geom.computeBoundingBox();
  }
  return geom;
}

/** Cell counts driven by mm/pixel, capped at the render resolution limit. */
function mmPerPixelCells(
  panelW: number,
  panelH: number,
  mmPerPixel: number,
  resolution: number,
): { cellsX: number; cellsY: number } {
  const tX = Math.max(1, Math.round(panelW / mmPerPixel));
  const tY = Math.max(1, Math.round(panelH / mmPerPixel));
  const scale = Math.min(1, resolution / Math.max(tX, tY));
  return {
    cellsX: Math.max(1, Math.round(tX * scale)),
    cellsY: Math.max(1, Math.round(tY * scale)),
  };
}

/** Build the lithophane plate for a side panel (centred, in local XY). */
function buildSidePlate(
  hm: HeightMap,
  params: Params,
  L: CubeLayout,
  resolution: number,
): BufferGeometry {
  // The image fills the square window between the posts, bottom rail and lid.
  const cropped = centerCropHeightMap(hm, 2 * L.windowHalf, 2 * L.windowHalf);
  const winZ = -L.sidePanelCenterZ; // window centre (Z = 0) in panel coordinates
  const { cellsX, cellsY } = mmPerPixelCells(L.sidePanelW, L.sidePanelH, params.mmPerPixel, resolution);
  const downsampled = downsampleHeightMap(cropped, cellsX, cellsY);
  const geom = buildLithophanePanel({
    width: L.sidePanelW,
    height: L.sidePanelH,
    thickness: L.t,
    tongueWidth: L.engage,
    imageRect: {
      minX: -L.windowHalf, maxX: L.windowHalf,
      minY: winZ - L.windowHalf, maxY: winZ + L.windowHalf,
    },
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: downsampled,
    cellsX,
    cellsY,
    mirrorX: params.relief === 'inward',
    reliefSign: reliefSign(params),
    gamma: params.lithoGamma,
  });
  // Center the plate on its midplane. When reliefSign = -1 the geometry was
  // flipped to -Z, so the translate must flip too — otherwise the panel sits
  // one full thickness inward of where it should be.
  geom.translate(0, 0, (-L.t / 2) * reliefSign(params));
  return geom;
}

/**
 * Build the lithophane plate for the top panel (flat in local XY, ready to print).
 * The image fills only the lid opening; the flat border beyond it rests on the
 * side-panel tops under the lid, and each corner is notched to clear a post.
 */
function buildTopPlate(
  hm: HeightMap,
  params: Params,
  L: CubeLayout,
  resolution: number,
): BufferGeometry {
  const { topPanelW, topPanelD } = L;
  const opening = 2 * (L.half - L.cornerReach);
  const cropped = centerCropHeightMap(hm, topPanelW, topPanelD);
  const { cellsX, cellsY } = mmPerPixelCells(topPanelW, topPanelD, params.mmPerPixel, resolution);
  const downsampled = downsampleHeightMap(cropped, cellsX, cellsY);
  const rs = reliefSign(params);
  const plate = buildLithophanePanel({
    width: topPanelW,
    height: topPanelD,
    thickness: L.t,
    tongueWidth: (topPanelW - opening) / 2,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: downsampled,
    cellsX,
    cellsY,
    // Top panel is viewed from above; light comes from below.
    // No X-mirror needed regardless of relief direction — the viewer always
    // looks straight down at the panel (not through it from the far side).
    mirrorX: false,
    reliefSign: rs,
    gamma: params.lithoGamma,
  });
  plate.translate(0, 0, (-L.t / 2) * rs);
  const n = L.topNotch;
  const geom = withManifoldScope(() => {
    const notches = L.corners.map(([sx, sy]) =>
      mBox(2 * n, 2 * n, 2 * L.t + 2, (sx * topPanelW) / 2, (sy * topPanelD) / 2, 0));
    return manifoldToGeometry(mSubtract(geometryToManifold(plate), mUnionAll(notches)));
  });
  geom.computeVertexNormals();
  return geom;
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

/** Top panel in its own flat (print) orientation — already in the XY plane. */
export function buildTopPanelFlat(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  return reliefUp(buildTopPlate(hm, params, L, resolution), params);
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

/** Top panel in assembled position: resting on the side-panel tops, under the lid. */
export function buildTopPanelInPlace(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const geom = buildTopPlate(hm, params, L, resolution);
  geom.translate(0, 0, L.panelTop + L.t / 2);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/** Build a part in its own flat (print) orientation for STL export. */
export function buildPanelFlat(
  slot: PanelSlot,
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  return reliefUp(buildSidePartLocal(hm, params, resolution), params);
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
