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

  // All vertical cutters start at the top of the solid floor so it stays unbroken.
  const grooveH = C - L.bottomThickness;
  const grooveZ = L.bottomThickness / 2;

  // Inner-corner ramps (the "wedge" look), from floor top to above the cube.
  for (const [sx, sy] of L.corners) {
    const ix = sx * (half - cornerReach);
    const iy = sy * (half - cornerReach);
    tools.push(
      rotBox(chamfer, chamfer, grooveH + 2, Math.PI / 4, { x: ix, y: iy, z: grooveZ + 1 }),
    );
  }

  // ±X faces: grooves narrow in X, at the panel's Y edges.
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      tools.push(
        box(slotW, slotD, grooveH, {
          x: sx * L.panelOffset,
          y: sy * L.grooveCenter,
          z: grooveZ,
        }),
      );
    }
  }
  // ±Y faces: grooves narrow in Y, at the panel's X edges.
  for (const sy of [1, -1]) {
    for (const sx of [1, -1]) {
      tools.push(
        box(slotD, slotW, grooveH, {
          x: sx * L.grooveCenter,
          y: sy * L.panelOffset,
          z: grooveZ,
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
