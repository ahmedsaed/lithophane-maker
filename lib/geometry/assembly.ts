import { Matrix4, Vector3, type BufferGeometry } from 'three';
import type { HeightMap, Params, PanelSlot, PartId, PartMesh } from './types';
import { cubeLayout, faceNormal, type CubeLayout } from './layout';
import { buildLithophanePanel } from './lithophanePanel';
import { centerCropHeightMap, downsampleHeightMap } from '../image/toHeightmap';
import { buildFrame } from './frame';

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

/** A complete side part (lithophane plate) in local frame. */
export function buildSidePartLocal(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  return buildSidePlate(hm, params, L, resolution);
}

/** The lid lithophane plate in local frame (centred in XY). */
export function buildLidLocal(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const cropped = centerCropHeightMap(hm, L.lidW, L.lidW);
  const { cellsX, cellsY } = mmPerPixelCells(L.lidW, L.lidW, params.mmPerPixel, resolution);
  const downsampled = downsampleHeightMap(cropped, cellsX, cellsY);
  const geom = buildLithophanePanel({
    width: L.lidW,
    height: L.lidW,
    thickness: L.lidThickness,
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
  geom.translate(0, 0, (-L.lidThickness / 2) * reliefSign(params));
  return geom;
}

/** Build a panel/lid already transformed into assembled cube coordinates. */
export function buildPanelInPlace(
  slot: PanelSlot,
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const isTop = slot === 'top';
  const local = isTop
    ? buildLidLocal(hm, params, resolution)
    : buildSidePartLocal(hm, params, resolution);

  const n = new Vector3(...faceNormal(slot));
  const up = isTop ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
  const right = new Vector3().crossVectors(up, n).normalize();
  const m = new Matrix4().makeBasis(right, up, n.clone());

  const pos = isTop
    ? new Vector3(0, 0, L.topPanelZ)
    : n.clone().multiplyScalar(L.panelOffset).setZ(L.sidePanelCenterZ);
  m.setPosition(pos);

  local.applyMatrix4(m);
  local.computeVertexNormals();
  local.computeBoundingBox();
  return local;
}

/** Build a part in its own flat (print) orientation for STL export. */
export function buildPanelFlat(
  slot: PanelSlot,
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  return slot === 'top'
    ? buildLidLocal(hm, params, resolution)
    : buildSidePartLocal(hm, params, resolution);
}

/** Build every available part in assembled position. */
export function buildAllParts(
  heightMaps: Partial<Record<PanelSlot, HeightMap>>,
  params: Params,
  resolution: number,
): PartMesh[] {
  const parts: PartMesh[] = [{ id: 'frame', geometry: buildFrame(params) }];
  (Object.keys(heightMaps) as PanelSlot[]).forEach((slot) => {
    const hm = heightMaps[slot];
    if (hm) {
      parts.push({
        id: slot,
        geometry: buildPanelInPlace(slot, hm, params, resolution),
      });
    }
  });
  return parts;
}

/** Direction to push a part when showing the exploded assembly view. */
export function explodeVector(id: PartId): Vector3 {
  if (id === 'frame') return new Vector3(0, 0, 0);
  if (id === 'top') return new Vector3(0, 0, 1);
  return new Vector3(...faceNormal(id as PanelSlot));
}
