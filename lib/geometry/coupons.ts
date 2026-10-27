import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import { buildFrame } from './frame';
import { buildLidFrame } from './lidFrame';
import { BLANK_HEIGHTMAP, buildSidePartLocal, standUpright } from './assembly';
import { buildLithophanePanel } from './lithophanePanel';
import {
  geometryToManifold,
  manifoldToGeometry,
  mBox,
  mCylinderZ,
  mIntersect,
  mSubtract,
  mUnionAll,
  withManifoldScope,
} from './mCsg';

/**
 * Test coupons: small pieces cut from the real part geometry so fit and
 * lithophane settings can be checked in minutes instead of a full-cube print.
 * All coupons use the front-left (−X, −Y) corner and come in print orientation,
 * centred on the origin with Z = 0 on the bed.
 */
export interface Coupon {
  name: string;
  geometry: BufferGeometry;
}

/** Groove clearances printed side by side by the clearance sweep; coupon N gets N dots. */
export const SWEEP_CLEARANCES = [0.15, 0.2, 0.25, 0.3, 0.35];
/** Peg clearances for the press-fit sweep; lid corner N gets N dots. */
export const PEG_SWEEP_CLEARANCES = [0, 0.05, 0.1, 0.15, 0.2];

/** How far the coupon window reaches past the corner post toward the cube centre. */
const MARGIN = 10;
/** Height of post above the floor on the groove coupon. */
const GROOVE_POST_H = 15;
/** Height of the side-panel strip that slides into the groove coupon. */
const STRIP_H = 20;

/** Crop a geometry to an axis-aligned box given by min/max corners. */
function crop(
  g: BufferGeometry,
  min: [number, number, number],
  max: [number, number, number],
  cutters: ReturnType<typeof mBox>[] = [],
): BufferGeometry {
  return withManifoldScope(() => {
    const box = mBox(
      max[0] - min[0], max[1] - min[1], max[2] - min[2],
      (min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2,
    );
    let m = mIntersect(geometryToManifold(g), box);
    if (cutters.length) m = mSubtract(m, mUnionAll(cutters));
    return manifoldToGeometry(m);
  });
}

/** Centre on XY and drop onto the bed (Z = 0). */
function toBed(g: BufferGeometry): BufferGeometry {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
  g.computeVertexNormals();
  return g;
}

/** XY window around the front-left corner post. */
function cornerWindow(params: Params): { lo: number; hi: number } {
  const L = cubeLayout(params);
  return { lo: -L.half - 1, hi: -L.half + L.cornerReach + MARGIN };
}

/**
 * Bottom of the front-left corner post with its two panel grooves and a patch
 * of floor. `dots` small pits are engraved in the floor to tell sweep coupons apart.
 */
export function buildGrooveCoupon(params: Params, dots = 0): BufferGeometry {
  const L = cubeLayout(params);
  const { lo, hi } = cornerWindow(params);
  const floorTop = -L.half + L.bottomThickness;
  const frame = buildFrame(params);
  const g = withManifoldScope(() => {
    // Pits sit in the open floor between the post and the cube centre, clear of the panels.
    const depth = Math.min(0.6, L.bottomThickness / 2);
    const pits = Array.from({ length: dots }, (_, i) =>
      mCylinderZ(0.6, 2 * depth, -L.half + L.cornerReach + 1.5 + i * 1.8, -L.half + L.cornerReach + MARGIN / 2, floorTop, 16),
    );
    return crop(frame, [lo, lo, -L.half - 1], [hi, hi, floorTop + GROOVE_POST_H], pits);
  });
  return toBed(g);
}

/**
 * Bottom corner of a side panel (tongue plus a strip of plate) to slide into the
 * groove coupon. Printed upright like the real panels, so it tests the same fit.
 */
export function buildPanelStripCoupon(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const panel = buildSidePartLocal(BLANK_HEIGHTMAP, params, 60);
  const W = L.sidePanelW;
  const H = L.sidePanelH;
  return standUpright(crop(panel, [-W / 2 - 1, -H / 2 - 1, -L.t - 1], [-W / 2 + L.engage + 6, -H / 2 + STRIP_H, L.t + 1]));
}

/** Top of the front-left corner post with its peg or magnet hole, for the lid corner coupon. */
export function buildPostTopCoupon(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { lo, hi } = cornerWindow(params);
  return toBed(crop(buildFrame(params), [lo, lo, L.postTop - L.postHoleDepth - 4], [hi, hi, L.half]));
}

/**
 * Front-left corner of the lid with its peg or magnet hole and a piece of the
 * top-panel recess, printed face-down like the full lid. `dots` small pits are
 * engraved in the recess to tell sweep coupons apart.
 */
export function buildLidCornerCoupon(params: Params, dots = 0): BufferGeometry {
  const L = cubeLayout(params);
  const { lo, hi } = cornerWindow(params);
  const inner = L.half - L.cornerReach;
  const lid = buildLidFrame(params);
  const g = withManifoldScope(() => {
    // Pits go in the recess ceiling over the front side panel, clear of the opening.
    const pits = Array.from({ length: dots }, (_, i) =>
      mCylinderZ(0.6, 1.2, -inner + 1.5 + i * 1.8, -(inner + L.panelOuter) / 2, L.postTop + L.lidRecess, 16),
    );
    return crop(lid, [lo, lo, L.postTop - L.postHoleDepth - 1], [hi, hi, L.half + 1], pits);
  });
  g.rotateX(Math.PI); // top face down, pegs up — same as the full lid
  return toBed(g);
}

/**
 * Ten-step brightness wedge (black → white) with the current thickness and
 * gamma settings. Backlight it to judge how each brightness level will look.
 * Printed upright like the real panels, since orientation changes the shading.
 */
export function buildLithoStepsCoupon(params: Params): BufferGeometry {
  const steps = 10;
  const px = 10; // pixels per step so bilinear sampling only blends at step edges
  const data = Float32Array.from({ length: steps * px }, (_, i) => Math.floor(i / px) / (steps - 1));
  const width = 70;
  const height = 22;
  const g = buildLithophanePanel({
    width,
    height,
    thickness: params.panelThickness,
    tongueWidth: 3,
    lithoMin: params.lithoMin,
    lithoMax: params.lithoMax,
    heightMap: { width: steps * px, height: 1, data },
    cellsX: Math.round(width / 0.2),
    cellsY: Math.round(height / 0.5),
    gamma: params.lithoGamma,
  });
  return standUpright(g);
}

/** One of everything at the current settings: groove fit, lid fit, lithophane wedge. */
export function buildTestKit(params: Params): Coupon[] {
  return [
    { name: 'groove-post', geometry: buildGrooveCoupon(params) },
    { name: 'panel-strip', geometry: buildPanelStripCoupon(params) },
    { name: 'post-top', geometry: buildPostTopCoupon(params) },
    { name: 'lid-corner', geometry: buildLidCornerCoupon(params) },
    { name: 'litho-steps', geometry: buildLithoStepsCoupon(params) },
  ];
}

const dotLabel = (i: number) => `${i + 1}dot${i ? 's' : ''}`;

/**
 * Groove coupons at each SWEEP_CLEARANCES value plus one panel strip and, for
 * press-fit lids, lid corners at each PEG_SWEEP_CLEARANCES value plus one post top.
 * The dot count on each coupon gives its position in the sweep.
 */
export function buildClearanceSweep(params: Params): Coupon[] {
  const coupons: Coupon[] = [
    ...SWEEP_CLEARANCES.map((clear, i) => ({
      name: `groove-post-${clear.toFixed(2)}mm-${dotLabel(i)}`,
      geometry: buildGrooveCoupon({ ...params, grooveClearance: clear }, i + 1),
    })),
    { name: 'panel-strip', geometry: buildPanelStripCoupon(params) },
  ];
  if (params.lidAttach === 'pressfit') {
    coupons.push(
      ...PEG_SWEEP_CLEARANCES.map((clear, i) => ({
        name: `lid-corner-peg-${clear.toFixed(2)}mm-${dotLabel(i)}`,
        geometry: buildLidCornerCoupon({ ...params, pegClearance: clear }, i + 1),
      })),
      { name: 'post-top', geometry: buildPostTopCoupon(params) },
    );
  }
  return coupons;
}
