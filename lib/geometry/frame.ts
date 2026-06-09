import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import { box, unionAll, subtractAll, type Vec3 } from './csg';
import { Brush } from 'three-bvh-csg';

/**
 * Build the cube frame: four corner posts + four top rails, with vertical
 * grooves for the side panels, a top groove for the lid panel, and corner
 * catch pockets the base-plate hooks snap into. Bottom is left open.
 */
export function buildFrame(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, p, t, clear, engage } = L;

  // --- Solid: posts + top rails ---
  const solids: Brush[] = [];
  for (const [cx, cy] of L.postCenters) {
    solids.push(box(p, p, C, { x: cx, y: cy, z: 0 }));
  }
  const railLen = C - 2 * p;
  const railZ = half - p / 2;
  solids.push(box(railLen, p, p, { y: half - p / 2, z: railZ })); // +Y rail
  solids.push(box(railLen, p, p, { y: -(half - p / 2), z: railZ })); // -Y rail
  solids.push(box(p, railLen, p, { x: half - p / 2, z: railZ })); // +X rail
  solids.push(box(p, railLen, p, { x: -(half - p / 2), z: railZ })); // -X rail

  let frame = unionAll(solids);

  // --- Cutters ---
  const tools: Brush[] = [];
  const slotW = t + 2 * clear; // across panel thickness
  const slotD = engage + clear; // groove depth + a touch
  const grooveCenter = half - p + engage / 2;

  // Vertical grooves for the four side panels (two posts per face).
  // ±X faces: grooves run in Z, narrow in X, at the panel's Y edges.
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      tools.push(
        box(slotW, slotD, C, {
          x: sx * L.panelOffset,
          y: sy * grooveCenter,
          z: 0,
        }),
      );
    }
  }
  // ±Y faces: grooves narrow in Y, at the panel's X edges.
  for (const sy of [1, -1]) {
    for (const sx of [1, -1]) {
      tools.push(
        box(slotD, slotW, C, {
          x: sx * grooveCenter,
          y: sy * L.panelOffset,
          z: 0,
        }),
      );
    }
  }

  // Top groove: recess under each top rail so the lid panel seats.
  const lidSlotH = t + 2 * clear;
  const lidZ = L.topPanelZ;
  const lidEdge = half - p + engage / 2;
  tools.push(box(L.topPanelW, slotD, lidSlotH, { y: lidEdge, z: lidZ }));
  tools.push(box(L.topPanelW, slotD, lidSlotH, { y: -lidEdge, z: lidZ }));
  tools.push(box(slotD, L.topPanelW, lidSlotH, { x: lidEdge, z: lidZ }));
  tools.push(box(slotD, L.topPanelW, lidSlotH, { x: -lidEdge, z: lidZ }));

  // Corner catch pockets for the base hooks, near the bottom inner corners.
  const pocket = pocketSpec(L, params);
  for (const [cx, cy] of L.postCenters) {
    tools.push(
      box(pocket.size, pocket.size, pocket.height, {
        x: cx - Math.sign(cx) * (p / 2),
        y: cy - Math.sign(cy) * (p / 2),
        z: -half + pocket.z,
      }),
    );
  }

  frame = subtractAll(frame, tools);
  const geom = frame.geometry as BufferGeometry;
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/** Catch-pocket geometry shared by frame (cut) and base (hook target). */
export function pocketSpec(
  L: ReturnType<typeof cubeLayout>,
  params: Params,
): { size: number; height: number; z: number; center: Vec3[] } {
  const size = Math.max(2, params.postSize * 0.5);
  const height = 3;
  const z = 6; // up from the bottom rim
  const center = L.postCenters.map(([cx, cy]) => ({
    x: cx - Math.sign(cx) * (params.postSize / 2),
    y: cy - Math.sign(cy) * (params.postSize / 2),
    z: -L.half + z,
  }));
  return { size, height, z, center };
}
