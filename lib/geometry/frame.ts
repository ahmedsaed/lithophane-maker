import type { BufferGeometry } from 'three';
import type { Brush } from 'three-bvh-csg';
import type { Params } from './types';
import { cubeLayout } from './layout';
import { box, rotBox, cylinderZ, unionAll, subtractAll } from './csg';

/**
 * Build the cube frame: four corner posts (square footprint with a 45° ramp
 * cut into each inner corner) joined to a solid bottom floor, with vertical
 * grooves for the four side panels and optional cable holes in the floor.
 *
 * The top is open and carries no rails — the top rails travel with the side
 * panels so the sides can drop in from above.
 */
export function buildFrame(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, t, clear, engage, cornerReach, chamfer } = L;

  // --- Solid: corner posts + bottom floor ---
  const solids: Brush[] = [];
  for (const [sx, sy] of L.corners) {
    const cx = sx * (half - cornerReach / 2);
    const cy = sy * (half - cornerReach / 2);
    solids.push(box(cornerReach, cornerReach, C, { x: cx, y: cy, z: 0 }));
  }
  solids.push(
    box(C, C, L.bottomThickness, { z: -half + L.bottomThickness / 2 }),
  );
  let frame = unionAll(solids);

  // --- Cutters ---
  const tools: Brush[] = [];
  const slotW = t + 2 * clear; // across panel thickness
  const slotD = engage + clear; // groove depth

  // Outer-corner bevels — run the full frame height so the bevel shows on posts and floor.
  for (const [sx, sy] of L.corners) {
    tools.push(
      rotBox(chamfer, chamfer, C + 2, Math.PI / 4, { x: sx * half, y: sy * half, z: 0 }),
    );
  }

  // All vertical groove cutters start at the top of the solid floor.
  const grooveH = C - L.bottomThickness;
  const grooveZ = L.bottomThickness / 2;

  // Guide channel: extend groove 2 mm past the post inner face so the slot is
  // visible from inside the cube and gives the tongue's inner edge clearance.
  const guideDepth = 2;
  const grooveD = slotD + guideDepth; // total groove depth including guide channel

  // Lead-in zone: wider opening at the top of each groove for easy alignment.
  const leadIn = 1.5;  // extra clearance per side at the entry
  const leadInH = 4;
  const leadInZ = grooveZ + grooveH / 2 - leadInH / 2; // centred at groove top

  // ±X faces: grooves narrow in X, at the panel's Y edges.
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      const gy = sy * (L.grooveCenter - guideDepth / 2);
      tools.push(
        box(slotW, grooveD, grooveH, {
          x: sx * L.panelOffset,
          y: gy,
          z: grooveZ,
        }),
      );
      tools.push(
        box(slotW + 2 * leadIn, grooveD + leadIn, leadInH, {
          x: sx * L.panelOffset,
          y: gy,
          z: leadInZ,
        }),
      );
    }
  }
  // ±Y faces: grooves narrow in Y, at the panel's X edges.
  for (const sy of [1, -1]) {
    for (const sx of [1, -1]) {
      const gx = sx * (L.grooveCenter - guideDepth / 2);
      tools.push(
        box(grooveD, slotW, grooveH, {
          x: gx,
          y: sy * L.panelOffset,
          z: grooveZ,
        }),
      );
      tools.push(
        box(grooveD + leadIn, slotW + 2 * leadIn, leadInH, {
          x: gx,
          y: sy * L.panelOffset,
          z: leadInZ,
        }),
      );
    }
  }

  // Cable/USB holes through the solid floor.
  for (const hole of params.cableHoles) {
    const r = Math.max(0.5, hole.diameter / 2);
    tools.push(
      cylinderZ(r, L.bottomThickness + 2, {
        x: hole.x,
        y: hole.y,
        z: -half + L.bottomThickness / 2,
      }),
    );
  }

  frame = subtractAll(frame, tools);
  const geom = frame.geometry as BufferGeometry;
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}
