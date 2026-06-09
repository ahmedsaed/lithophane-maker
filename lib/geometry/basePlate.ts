import type { BufferGeometry } from 'three';
import type { Brush } from 'three-bvh-csg';
import type { Params } from './types';
import { cubeLayout } from './layout';
import { box, cylinderZ, union, subtractAll } from './csg';
import { cornerHook } from './snapHook';

/**
 * Build the base plate: a flat plate that nests between the four posts, four
 * corner snap hooks that clip into the frame's catch pockets, and optional
 * cable/USB holes for routing a light source inside the cube.
 */
export function buildBasePlate(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, p, clear } = L;

  const baseW = C - 2 * p - 2 * clear;
  const baseHalf = baseW / 2;
  const baseThk = Math.max(2, params.panelThickness);
  const z0 = -half; // bottom rim
  const plateCenterZ = z0 + baseThk / 2;
  const baseTopZ = z0 + baseThk;

  // Plate + four corner hooks.
  let base: Brush = box(baseW, baseW, baseThk, { z: plateCenterZ });
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      base = union(base, cornerHook(L, sx, sy, baseTopZ, baseHalf));
    }
  }

  // Cable/USB holes through the plate.
  const tools: Brush[] = [];
  for (const hole of params.cableHoles) {
    const r = Math.max(0.5, hole.diameter / 2);
    tools.push(
      cylinderZ(r, baseThk + 2, { x: hole.x, y: hole.y, z: plateCenterZ }),
    );
  }

  const result = tools.length ? subtractAll(base, tools) : base;
  const geom = result.geometry as BufferGeometry;
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}
