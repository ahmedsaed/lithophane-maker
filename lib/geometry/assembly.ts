import { Matrix4, Vector3, type BufferGeometry } from 'three';
import type { HeightMap, Params, PanelSlot, PartId, PartMesh } from './types';
import { cubeLayout, faceNormal, type CubeLayout } from './layout';
import { buildLithophanePanel, panelCells } from './lithophanePanel';
import { extrudePrism, mergeGeoms } from './prisms';
import { buildFrame } from './frame';

function reliefSign(params: Params): 1 | -1 {
  return params.relief === 'outward' ? 1 : -1;
}

/** Build the lithophane plate for a side panel (centred, in local XY). */
function buildSidePlate(
  hm: HeightMap,
  params: Params,
  L: CubeLayout,
  resolution: number,
): BufferGeometry {
  const { cellsX, cellsY } = panelCells(hm, resolution);
  const geom = buildLithophanePanel({
    width: L.sidePanelW,
    height: L.sidePanelH,
    thickness: L.t,
    tongueWidth: L.engage,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: hm,
    cellsX,
    cellsY,
    mirrorX: params.relief === 'inward',
    reliefSign: reliefSign(params),
  });
  geom.translate(0, 0, -L.t / 2);
  return geom;
}

/**
 * Build the wedge-shaped top rail carried by a side panel. In local frame the
 * plate lies in XY with the cube interior at −Z; the rail rises above the
 * plate top (+Y), extends inward (−Z). The sloped face runs from the interior
 * ledge (where the lid rests) diagonally down to the exterior plate face, so
 * the bevel is visible from outside the cube rather than from inside.
 */
function buildSideRail(L: CubeLayout): BufferGeometry {
  const { t, sidePanelH: H, railHeight, railDepth, lidThickness } = L;
  const topPlate = H / 2;
  const peakY = topPlate + railHeight;
  const ledgeTopY = topPlate + railHeight - lidThickness;
  const inwardZ = -(t / 2 + railDepth);

  // Profile in (Y, Z); extruded along local X (panel width).
  // Peak and interior face are at inwardZ; slope runs from interior ledge down
  // to the exterior plate face so it reads as an outward-facing bevel.
  const profile: Array<[number, number]> = [
    [peakY, inwardZ], // interior-top peak
    [ledgeTopY, inwardZ], // interior ledge (lid rests here)
    [topPlate, t / 2], // exterior-bottom (joins plate top) — outward slope
    [topPlate, inwardZ], // interior-bottom
  ];

  // Map extrude-geometry axes (a, b, extrude) -> local (X=extrude, Y=a, Z=b).
  const m = new Matrix4().makeBasis(
    new Vector3(0, 1, 0),
    new Vector3(0, 0, 1),
    new Vector3(1, 0, 0),
  );
  return extrudePrism(profile, L.sidePanelW, m);
}

/** A complete side part (lithophane plate + top rail) in local frame. */
export function buildSidePartLocal(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  return mergeGeoms([buildSidePlate(hm, params, L, resolution), buildSideRail(L)]);
}

/** The lid lithophane plate in local frame (centred in XY). */
export function buildLidLocal(
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const { cellsX, cellsY } = panelCells(hm, resolution);
  const geom = buildLithophanePanel({
    width: L.lidW,
    height: L.lidW,
    thickness: L.lidThickness,
    tongueWidth: L.engage,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: hm,
    cellsX,
    cellsY,
    mirrorX: params.relief === 'inward',
    reliefSign: reliefSign(params),
  });
  geom.translate(0, 0, -L.lidThickness / 2);
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
