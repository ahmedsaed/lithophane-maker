import type { CubeLayout } from './layout';
import type { Manifold } from 'manifold-3d';
import { getManifold } from './manifoldInit';

// Baked-in chamfer geometry (subtle; tweak here). DEPTH must stay below the panel
// recess (~2.5 mm) so the bevel never reaches the panel/tongue; RUN sets a single
// consistent slope angle (atan(DEPTH/RUN) ≈ 31°) across every face and edge.
const CHAMFER_DEPTH = 1.2; // mm the bevel cuts in along the face normal
const CHAMFER_RUN   = 2.0; // mm the opening widens at the cube surface

const eps = 0.02;

/**
 * Truncated-pyramid cutter that bevels the exterior rim of one panel opening:
 * full opening size at CHAMFER_DEPTH into the recess, widened by CHAMFER_RUN at
 * the cube surface. Subtracting it slopes the OUTER groove wall down into the
 * panel on all four sides at once (with mitred corners) — without touching the
 * inner wall or the tongue, so panel retention is unchanged.
 *
 * `axis` 0/1/2 = X/Y/Z; `sign` ±1 selects the face.
 */
export function faceChamferCutter(L: CubeLayout, axis: 0 | 1 | 2, sign: 1 | -1): Manifold {
  const { Manifold, CrossSection } = getManifold();
  const openHalf = L.half - L.cornerReach;   // opening half-extent (railW/2 = lid inner edge)
  const big      = openHalf + CHAMFER_RUN;
  const height   = CHAMFER_DEPTH + eps;
  const scale    = openHalf / big;

  // Base (big) at z=0, top (opening size) at z=height — a truncated pyramid.
  const cs = new CrossSection([[[-big, -big], [big, -big], [big, big], [-big, big]]]);
  let solid = Manifold.extrude(cs, height, 0, 0, [scale, scale]);

  // Point local +Z inward (−sign along the face axis); base stays at the origin.
  if (axis === 0) solid = solid.rotate([0, -90 * sign, 0]);
  else if (axis === 1) solid = solid.rotate([90 * sign, 0, 0]);
  else if (sign === 1) solid = solid.rotate([180, 0, 0]);

  // Seat the big base just outside the cube surface so the bevel breaks through it.
  const t = sign * (L.half + eps);
  solid = solid.translate(axis === 0 ? t : 0, axis === 1 ? t : 0, axis === 2 ? t : 0);
  return solid;
}

/**
 * Chamfer cutters a part should subtract: the four side faces plus one cap face
 * (`capSign` = +1 top for the lid, −1 bottom for the fused base/frame). Cutters
 * for faces a part doesn't border are harmless no-ops on it.
 */
export function chamferCutters(L: CubeLayout, capSign: 1 | -1): Manifold[] {
  return [
    faceChamferCutter(L, 0, 1), faceChamferCutter(L, 0, -1),
    faceChamferCutter(L, 1, 1), faceChamferCutter(L, 1, -1),
    faceChamferCutter(L, 2, capSign),
  ];
}
