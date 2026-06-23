import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import {
  mBox,
  mUnionAll, mSubtract, mUnion,
  manifoldToGeometry,
} from './mCsg';
import { buildBase } from './base';

const eps = 0.02;

export function buildFrame(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { half, halfZ, wallHeight, t, clear, engage, cornerReach, grooveCenter, tabHeight } = L;

  // ── STEP 1: corner posts ────────────────────────────────────────────────────
  // Posts span the full wall height (−halfZ → +halfZ): the lid caps the top and
  // the fused base ring caps the bottom, so there is no floor to start above.
  const postH = wallHeight;
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
  const grooveH    = wallHeight + 2 * eps;
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
  // Position matches ridgeZ in lidFrame.ts: halfZ − tabHeight + ridgeSize.
  const ridgeSize       = 0.5;
  const ridgeProtrusion = ridgeSize * 0.2;                     // matches lidFrame.ts
  const ridgeH          = ridgeProtrusion * 2 / Math.sqrt(3);  // equilateral height
  const ridgeW          = slotD * 0.5;
  const outerEdgeSnap   = gi + grooveD / 2;
  const snapZ           = halfZ - tabHeight + ridgeSize;  // centre Z, matches ridgeZ in lidFrame.ts

  for (const [sx, sy] of L.corners) {
    // Groove bounding box of the equilateral ridge + eps clearance
    tools.push(mBox(ridgeProtrusion + eps, ridgeW + 2 * eps, ridgeH + 2 * eps,
      sx * (outerEdgeSnap + (ridgeProtrusion + eps) / 2), sy * grooveCenter, snapZ));
    tools.push(mBox(ridgeW + 2 * eps, ridgeProtrusion + eps, ridgeH + 2 * eps,
      sx * grooveCenter, sy * (outerEdgeSnap + (ridgeProtrusion + eps) / 2), snapZ));
  }

  frame = mSubtract(frame, mUnionAll(tools));

  // ── STEP 3: fused base ring ────────────────────────────────────────────────
  // A mirror of the lid, permanently fused below the posts. Closes the bottom
  // and accepts a slide-in bottom lithophane panel.
  frame = mUnion(frame, buildBase(L));

  return manifoldToGeometry(frame);
}
