import { Matrix4, Vector3, type BufferGeometry } from 'three';
import type { HeightMap, Params, PanelSlot, PartId, PartMesh } from './types';
import { cubeLayout, faceNormal, type CubeLayout } from './layout';
import { buildLithophanePanel } from './lithophanePanel';
import { centerCropHeightMap, downsampleHeightMap } from '../image/toHeightmap';
import { buildFrame } from './frame';
import { buildLidFrame } from './lidFrame';
import { buildPlugInPlace } from './plug';

function reliefSign(params: Params): 1 | -1 {
  return params.relief === 'outward' ? 1 : -1;
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
  const cropped = centerCropHeightMap(hm, L.sidePanelW, L.sidePanelH);
  const { cellsX, cellsY } = mmPerPixelCells(L.sidePanelW, L.sidePanelH, params.mmPerPixel, resolution);
  const downsampled = downsampleHeightMap(cropped, cellsX, cellsY);
  const geom = buildLithophanePanel({
    width: L.sidePanelW,
    height: L.sidePanelH,
    thickness: L.t,
    tongueWidth: L.engage,
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

/** Build the lithophane plate for the top panel (flat in local XY, ready to print). */
function buildTopPlate(
  hm: HeightMap,
  params: Params,
  L: CubeLayout,
  resolution: number,
): BufferGeometry {
  const { topPanelW, topPanelD } = L;
  const cropped = centerCropHeightMap(hm, topPanelW, topPanelD);
  const { cellsX, cellsY } = mmPerPixelCells(topPanelW, topPanelD, params.mmPerPixel, resolution);
  const downsampled = downsampleHeightMap(cropped, cellsX, cellsY);
  const rs = reliefSign(params);
  const geom = buildLithophanePanel({
    width: topPanelW,
    height: topPanelD,
    thickness: L.t,
    tongueWidth: L.engage,
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
  geom.translate(0, 0, (-L.t / 2) * rs);
  return geom;
}

/** Build the lithophane plate for the bottom panel (flat in local XY, ready to print). */
function buildBottomPlate(
  hm: HeightMap,
  params: Params,
  L: CubeLayout,
  resolution: number,
): BufferGeometry {
  const { bottomPanelW, bottomPanelD } = L;
  const cropped = centerCropHeightMap(hm, bottomPanelW, bottomPanelD);
  const { cellsX, cellsY } = mmPerPixelCells(bottomPanelW, bottomPanelD, params.mmPerPixel, resolution);
  const downsampled = downsampleHeightMap(cropped, cellsX, cellsY);
  // The bottom panel mirrors the top: its relief points the opposite way in Z
  // (outward = −Z, downward, away from the cube) so the sign is flipped.
  const rs = (reliefSign(params) * -1) as 1 | -1;
  const geom = buildLithophanePanel({
    width: bottomPanelW,
    height: bottomPanelD,
    thickness: L.t,
    tongueWidth: L.engage,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: downsampled,
    cellsX,
    cellsY,
    // Bottom panel is viewed from below; the X axis appears flipped relative to
    // the top panel (which is viewed from above), so mirror X to keep the image
    // reading the same way round.
    mirrorX: true,
    reliefSign: rs,
    gamma: params.lithoGamma,
  });
  geom.translate(0, 0, (-L.t / 2) * rs);
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
  return buildTopPlate(hm, params, L, resolution);
}

/** Bottom panel in its own flat (print) orientation — already in the XY plane. */
export function buildBottomPanelFlat(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  return buildBottomPlate(hm, params, L, resolution);
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

/**
 * Top panel in assembled position: flat in the XY plane, centred in the lid
 * groove. The panel slides along Y from the open front (−Y) to the back
 * inner face, so its centre Y = −cornerReach/2.
 */
export function buildTopPanelInPlace(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const geom = buildTopPlate(hm, params, L, resolution);
  // Panel is symmetric: spans [−topPanelD/2, +topPanelD/2], centred at Y = 0.
  geom.translate(0, 0, L.lidCenterZ);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/**
 * Bottom panel in assembled position: mirror of the top panel, seated in the
 * fused base ring below the cube. Centred at Y = 0, at the base groove Z.
 */
export function buildBottomPanelInPlace(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const geom = buildBottomPlate(hm, params, L, resolution);
  geom.translate(0, 0, L.baseCenterZ);
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
  return buildSidePartLocal(hm, params, resolution);
}

/** Build every available part in assembled position. */
export function buildAllParts(
  heightMaps: Partial<Record<PanelSlot, HeightMap>>,
  params: Params,
  resolution: number,
): PartMesh[] {
  const L = cubeLayout(params);
  const parts: PartMesh[] = [
    { id: 'frame',    geometry: buildFrame(params) },
    { id: 'lid',      geometry: buildLidFrame(params) },
    { id: 'lidPlug',  geometry: buildPlugInPlace(params, L.lidCenterZ) },
    { id: 'basePlug', geometry: buildPlugInPlace(params, L.baseCenterZ, true) },
  ];
  (Object.keys(heightMaps) as PanelSlot[]).forEach((slot) => {
    const hm = heightMaps[slot];
    if (!hm) return;
    let geometry: BufferGeometry;
    if (slot === 'top') {
      geometry = buildTopPanelInPlace(hm, params, resolution);
    } else if (slot === 'bottom') {
      geometry = buildBottomPanelInPlace(hm, params, resolution);
    } else {
      geometry = buildPanelInPlace(slot, hm, params, resolution);
    }
    parts.push({ id: slot, geometry });
  });
  return parts;
}

/** Direction to push a part when showing the exploded assembly view. */
export function explodeVector(id: PartId): Vector3 {
  if (id === 'frame')    return new Vector3(0, 0, 0);
  if (id === 'lid')      return new Vector3(0, 0, 1);
  if (id === 'lidPlug')  return new Vector3(0, -1, 1);  // out the lid front opening
  if (id === 'basePlug') return new Vector3(0, -1, -1); // out the base front opening
  if (id === 'top')      return new Vector3(0, 0, 2);   // above the lid
  if (id === 'bottom')   return new Vector3(0, 0, -2);  // below the base
  return new Vector3(...faceNormal(id as PanelSlot));
}
