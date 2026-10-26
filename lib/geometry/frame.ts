import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout, type CubeLayout } from './layout';
import {
  mBox, mCylinderZ,
  mUnionAll, mSubtract,
  manifoldToGeometry, withManifoldScope,
  type Manifold,
} from './mCsg';

const eps = 0.02;
const guideDepth = 2;

/**
 * Rails along each face between the posts, from z0 to z1, reaching from the
 * cube face in to `innerFace`. The frame's bottom rails reach past the panel
 * (outer wall + inner wall, with the groove cut by panelSlotCutters); the lid's
 * are an outer skirt only, since the top panel overlaps the side-panel tops.
 */
export function faceRails(L: CubeLayout, z0: number, z1: number, innerFace = L.railInner): Manifold[] {
  const { half } = L;
  const railInner = innerFace;
  const inner = half - L.cornerReach;
  const len = 2 * (inner + eps); // overlap the posts so the union fuses
  const depth = half - railInner;
  const mid = (railInner + half) / 2;
  const h = z1 - z0;
  const zc = (z0 + z1) / 2;
  return [
    mBox(len, depth, h, 0, mid, zc),
    mBox(len, depth, h, 0, -mid, zc),
    mBox(depth, len, h, mid, 0, zc),
    mBox(depth, len, h, -mid, 0, zc),
  ];
}

/**
 * Everything cut to receive the panels between z0 and z1: the vertical post
 * grooves, the inner-corner pockets and (with `railSlots`) the horizontal panel
 * slots through the rails. Cutters run eps past z0/z1 so no face is coplanar
 * with the solid.
 */
export function panelSlotCutters(L: CubeLayout, z0: number, z1: number, railSlots = true): Manifold[] {
  const { t, clear, engage, grooveCenter } = L;
  const slotW = t + 2 * clear;
  const slotD = engage + clear;
  const grooveD = slotD + guideDepth;
  const h = z1 - z0 + 2 * eps;
  const zc = (z0 + z1) / 2;
  const tools: Manifold[] = [];

  // Vertical grooves in the posts, one per panel edge.
  for (const sx of [1, -1] as const) {
    for (const sy of [1, -1] as const) {
      const g = grooveCenter - guideDepth / 2;
      tools.push(mBox(slotW, grooveD, h, sx * L.panelOffset, sy * g, zc)); // ±X faces
      tools.push(mBox(grooveD, slotW, h, sx * g, sy * L.panelOffset, zc)); // ±Y faces
    }
  }

  // Inner-corner removal — size grooveD+eps so faces don't coincide with slots.
  const gi = grooveCenter - guideDepth / 2;
  for (const [sx, sy] of L.corners) {
    tools.push(mBox(grooveD + eps, grooveD + eps, h, sx * gi, sy * gi, zc));
  }

  if (!railSlots) return tools;
  // Panel slots through the rails, spanning the panel width plus clearance.
  const span = L.sidePanelW + 2 * clear;
  for (const s of [1, -1] as const) {
    tools.push(mBox(span, slotW, h, 0, s * L.panelOffset, zc));
    tools.push(mBox(slotW, span, h, s * L.panelOffset, 0, zc));
  }
  return tools;
}

export function buildFrame(params: Params): BufferGeometry {
  return withManifoldScope(() => buildFrameScoped(params));
}

function buildFrameScoped(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { half, cornerReach, bottomThickness, postTop } = L;
  const floorTop = -half + bottomThickness;
  const railTop = -half + cornerReach; // bottom band matches the post width

  // Corner posts from the floor top to postTop, where the lid sits. They and
  // the rails reach eps down into the floor so the union fuses one body.
  const postH = postTop - floorTop + eps;
  const postCenterZ = (postTop + floorTop - eps) / 2;
  const posts = L.corners.map(([sx, sy]) =>
    mBox(cornerReach, cornerReach, postH,
         sx * (half - cornerReach / 2),
         sy * (half - cornerReach / 2),
         postCenterZ),
  );
  const floor = mBox(L.C, L.C, bottomThickness, 0, 0, -half + bottomThickness / 2);
  const frame = mUnionAll([...posts, floor, ...faceRails(L, floorTop - eps, railTop)]);

  const tools = panelSlotCutters(L, floorTop, postTop);

  // Peg / magnet holes in the post tops, centred in the solid outer corner.
  for (const [sx, sy] of L.corners) {
    tools.push(mCylinderZ(L.attachHoleD / 2, 2 * L.postHoleDepth,
      sx * L.attachOffset, sy * L.attachOffset, postTop, 48));
  }

  // Cable / USB holes
  for (const hole of params.cableHoles) {
    const r = Math.max(0.5, hole.diameter / 2);
    tools.push(mCylinderZ(r, bottomThickness + 2 * eps, hole.x, hole.y, -half + bottomThickness / 2));
  }

  return manifoldToGeometry(mSubtract(frame, mUnionAll(tools)));
}
