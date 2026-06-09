import { Matrix4, Vector3, type BufferGeometry } from 'three';
import type { HeightMap, Params, PanelSlot, PartId, PartMesh } from './types';
import { cubeLayout, faceNormal } from './layout';
import { buildLithophanePanel, panelCells } from './lithophanePanel';
import { buildFrame } from './frame';
import { buildBasePlate } from './basePlate';

/** Up vector used to keep each panel's image upright. */
function panelUp(slot: PanelSlot): Vector3 {
  return slot === 'top' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
}

/**
 * Build a single panel geometry already transformed into assembled cube
 * coordinates. Relief points outward or inward per params; inward is a 180°
 * turn about the up axis (keeps winding, and mirrors the image so it reads
 * correctly when viewed through the flat side).
 */
export function buildPanelInPlace(
  slot: PanelSlot,
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const isTop = slot === 'top';
  const W = isTop ? L.topPanelW : L.sidePanelW;
  const H = isTop ? L.topPanelW : L.sidePanelH;
  const { cellsX, cellsY } = panelCells(hm, resolution);

  const geom = buildLithophanePanel({
    width: W,
    height: H,
    thickness: L.t,
    tongueWidth: L.engage,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: hm,
    cellsX,
    cellsY,
  });

  // Centre the plate on its mid-plane (border spans ±t/2).
  geom.translate(0, 0, -L.t / 2);

  const n = new Vector3(...faceNormal(slot));
  const up = panelUp(slot);
  const right = new Vector3().crossVectors(up, n).normalize();
  const inward = params.relief === 'inward';

  const xAxis = inward ? right.clone().multiplyScalar(-1) : right;
  const zAxis = inward ? n.clone().multiplyScalar(-1) : n.clone();

  const m = new Matrix4().makeBasis(xAxis, up, zAxis);
  const offset = isTop ? L.topPanelZ : L.panelOffset;
  m.setPosition(n.clone().multiplyScalar(offset));
  geom.applyMatrix4(m);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/**
 * Build a panel in its own flat orientation (relief on +Z, lying in XY) — the
 * ideal print orientation, used for STL export.
 */
export function buildPanelFlat(
  slot: PanelSlot,
  hm: HeightMap,
  params: Params,
  resolution: number,
): BufferGeometry {
  const L = cubeLayout(params);
  const isTop = slot === 'top';
  const { cellsX, cellsY } = panelCells(hm, resolution);
  return buildLithophanePanel({
    width: isTop ? L.topPanelW : L.sidePanelW,
    height: isTop ? L.topPanelW : L.sidePanelH,
    thickness: L.t,
    tongueWidth: L.engage,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: hm,
    cellsX,
    cellsY,
  });
}

/** Build every available part in assembled position. */
export function buildAllParts(
  heightMaps: Partial<Record<PanelSlot, HeightMap>>,
  params: Params,
  resolution: number,
): PartMesh[] {
  const parts: PartMesh[] = [];
  parts.push({ id: 'frame', geometry: buildFrame(params) });
  parts.push({ id: 'base', geometry: buildBasePlate(params) });
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
  switch (id) {
    case 'frame':
      return new Vector3(0, 0, 0);
    case 'base':
      return new Vector3(0, 0, -1);
    case 'top':
      return new Vector3(0, 0, 1);
    default:
      return new Vector3(...faceNormal(id as PanelSlot));
  }
}
