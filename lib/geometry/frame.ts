import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import {
  mBox, mCylinderZ, mExtrudePrism,
  mUnionAll, mSubtract, mUnion,
  manifoldToGeometry,
} from './mCsg';
import type { Mat4 } from 'manifold-3d';

const eps = 0.02;

export function buildFrame(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, t, clear, engage, cornerReach, grooveCenter, bottomThickness } = L;

  // ── STEP 1: corner posts ────────────────────────────────────────────────────
  // Posts run from floor top (−half+bottomThickness) to cube top (+half),
  // matching the panel height exactly.
  const postH = C - bottomThickness;
  const postCenterZ = bottomThickness / 2;
  const posts = L.corners.map(([sx, sy]) =>
    mBox(cornerReach, cornerReach, postH,
         sx * (half - cornerReach / 2),
         sy * (half - cornerReach / 2),
         postCenterZ),
  );

  // ── STEP 2: floor ───────────────────────────────────────────────────────────
  const floor = mBox(C, C, L.bottomThickness, 0, 0, -half + L.bottomThickness / 2);

  let frame = mUnionAll([...posts, floor]);

  // ── STEP 3: groove cutters ─────────────────────────────────────────────────
  const slotW      = t + 2 * clear;
  const slotD      = engage + clear;
  // Extend eps past both the floor top and the post top so no cutter face is
  // coplanar with a frame face — this is critical for manifold output.
  const grooveH    = C - L.bottomThickness + 2 * eps;
  const grooveZ    = L.bottomThickness / 2;
  const guideDepth = 2;
  const grooveD    = slotD + guideDepth;

  const tools = [];

  // ±X face slots
  for (const sx of [1, -1] as const) {
    for (const sy of [1, -1] as const) {
      const gy = sy * (grooveCenter - guideDepth / 2);
      tools.push(mBox(slotW, grooveD, grooveH, sx * L.panelOffset, gy, grooveZ));
    }
  }
  // ±Y face slots
  for (const sy of [1, -1] as const) {
    for (const sx of [1, -1] as const) {
      const gx = sx * (grooveCenter - guideDepth / 2);
      tools.push(mBox(grooveD, slotW, grooveH, gx, sy * L.panelOffset, grooveZ));
    }
  }

  // Inner-corner removal — size grooveD+eps so faces don't coincide with slots.
  const gi = grooveCenter - guideDepth / 2;
  for (const [sx, sy] of L.corners) {
    tools.push(mBox(grooveD + eps, grooveD + eps, grooveH, sx * gi, sy * gi, grooveZ));
  }

  // Outer arm-tip chamfers — right triangle engage×gap, same shape as base wedges
  const gap = half - L.panelOffset - slotW / 2;
  if (params.chamfer && gap > 0) {
    const innerFace = half - cornerReach;
    // Triangle origin is offset by -eps so no vertex lies exactly on a post face —
    // coplanar cutter/frame faces cause manifold artifacts (same reason grooveH uses +2*eps).
    const triArm: Array<[number, number]> = [[-eps, -eps], [engage + eps, -eps], [-eps, gap + eps]];
    for (const [sx, sy] of L.corners) {
      const sxy = sx * sy;
      // X arm tip at (sx·half, sy·innerFace)
      // local X→(−sx,0), local Y→(0,sy), Z_z = −sxy to give det = +1
      const ZzX = -sxy;
      tools.push(mExtrudePrism(triArm, grooveH,
        [-sx,0,0,0, 0,sy,0,0, 0,0,ZzX,0, sx*half, sy*innerFace, grooveZ, 1] as unknown as Mat4));
      // Y arm tip at (sx·innerFace, sy·half)
      // local X→(0,−sy), local Y→(sx,0), Z_z = sxy to give det = +1
      const ZzY = sxy;
      tools.push(mExtrudePrism(triArm, grooveH,
        [0,-sy,0,0, sx,0,0,0, 0,0,ZzY,0, sx*innerFace, sy*half, grooveZ, 1] as unknown as Mat4));
    }
  }

  // Cable / USB holes
  for (const hole of params.cableHoles) {
    const r = Math.max(0.5, hole.diameter / 2);
    tools.push(mCylinderZ(r, L.bottomThickness + 2 * eps, hole.x, hole.y, -half + L.bottomThickness / 2));
  }

  frame = mSubtract(frame, mUnionAll(tools));

  // ── STEP 4: base-chamfer wedges ────────────────────────────────────────────
  const floorTop     = -half + L.bottomThickness;
  const wedgeOriginZ = floorTop - eps;
  // gap already declared above in Step 3

  if (params.chamfer && gap > 0) {
    const tri: Array<[number, number]> = [[0, 0], [gap, 0], [gap, engage + eps]];
    const W = wedgeOriginZ;

    // Column-major Mat4 arrays derived from the verified row-major Three.js matrices:
    //   +Y face: set( 0, 0,-1,   0,   -1, 0, 0, half,   0, 1, 0, W,  0,0,0,1)
    //   -Y face: set( 0, 0, 1,   0,    1, 0, 0,-half,   0, 1, 0, W,  0,0,0,1)
    //   +X face: set(-1, 0, 0, half,   0, 0, 1,    0,   0, 1, 0, W,  0,0,0,1)
    //   -X face: set( 1, 0, 0,-half,   0, 0,-1,    0,   0, 1, 0, W,  0,0,0,1)
    // Each has det=+1 (proper rotation), so manifold will orient normals outward.
    const wedgeMats: Mat4[] = [
      //  col0       col1      col2        col3
      [ 0,-1,0,0,  0,0,1,0,  -1, 0,0,0,  0,  half, W, 1 ],  // +Y
      [ 0, 1,0,0,  0,0,1,0,   1, 0,0,0,  0, -half, W, 1 ],  // -Y
      [-1, 0,0,0,  0,0,1,0,   0, 1,0,0,  half,  0, W, 1 ],  // +X
      [ 1, 0,0,0,  0,0,1,0,   0,-1,0,0, -half,  0, W, 1 ],  // -X
    ];

    const wedges = wedgeMats.map((mat) => mExtrudePrism(tri, C, mat));
    frame = mUnion(frame, mUnionAll(wedges));
  }

  return manifoldToGeometry(frame);
}
