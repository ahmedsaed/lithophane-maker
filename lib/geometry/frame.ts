import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import {
  mBox, mExtrudePrism,
  mUnionAll, mSubtract, mUnion,
  manifoldToGeometry,
} from './mCsg';
import { buildBase } from './base';
import type { Mat4 } from 'manifold-3d';

const eps = 0.02;

export function buildFrame(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, t, clear, engage, cornerReach, grooveCenter, tabHeight } = L;

  // ── STEP 1: corner posts ────────────────────────────────────────────────────
  // Posts span the full cube height (−half → +half): the lid caps the top and
  // the fused base ring caps the bottom, so there is no floor to start above.
  const postH = C;
  const posts = L.corners.map(([sx, sy]) =>
    mBox(cornerReach, cornerReach, postH,
         sx * (half - cornerReach / 2),
         sy * (half - cornerReach / 2),
         0),
  );

  let frame = mUnionAll(posts);

  // ── STEP 2: groove cutters ─────────────────────────────────────────────────
  const slotW      = t + 2 * clear;
  const slotD      = engage + clear;
  // Run the full post height plus eps past both ends so no cutter face is
  // coplanar with a post face — this is critical for manifold output.
  const grooveH    = C + 2 * eps;
  const grooveZ    = 0;
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

  // Snap grooves — 0.5 mm recesses in the inner corner pocket walls that receive
  // the lid tab ridges for a click-lock fit when the lid is pressed down.
  // Position matches ridgeZ in lidFrame.ts: half − tabHeight + ridgeSize.
  const ridgeSize       = 0.5;
  const ridgeProtrusion = ridgeSize * 0.2;                     // matches lidFrame.ts
  const ridgeH          = ridgeProtrusion * 2 / Math.sqrt(3);  // equilateral height
  const ridgeW          = slotD * 0.5;
  const outerEdgeSnap   = gi + grooveD / 2;
  const snapZ           = half - tabHeight + ridgeSize;  // centre Z, matches ridgeZ in lidFrame.ts

  for (const [sx, sy] of L.corners) {
    // Groove bounding box of the equilateral ridge + eps clearance
    tools.push(mBox(ridgeProtrusion + eps, ridgeW + 2 * eps, ridgeH + 2 * eps,
      sx * (outerEdgeSnap + (ridgeProtrusion + eps) / 2), sy * grooveCenter, snapZ));
    tools.push(mBox(ridgeW + 2 * eps, ridgeProtrusion + eps, ridgeH + 2 * eps,
      sx * grooveCenter, sy * (outerEdgeSnap + (ridgeProtrusion + eps) / 2), snapZ));
  }

  // Outer arm-tip chamfers — right triangle engage×gap, extruded the full height.
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

  frame = mSubtract(frame, mUnionAll(tools));

  // ── STEP 3: fused base ring ────────────────────────────────────────────────
  // A mirror of the lid, permanently fused below the posts. Closes the bottom
  // and accepts a slide-in bottom lithophane panel.
  frame = mUnion(frame, buildBase(L));

  return manifoldToGeometry(frame);
}
