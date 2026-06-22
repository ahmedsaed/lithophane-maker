import type { CubeLayout } from './layout';
import { buildPanelRing } from './lidFrame';
import type { Manifold } from './mCsg';

/**
 * Base ring — an exact mirror of the lid across z = 0, sitting below the cube.
 *
 * Unlike the lid it is NOT a separate, detachable part: it is fused into the
 * frame (see frame.ts) so the cube stands on a closed bottom. It therefore has
 * no alignment tabs or snap ridges — those only exist to clip the removable lid
 * onto the posts.
 *
 * It carries the same inner-face grooves as the lid, so a bottom lithophane
 * panel slides in from the open front (−Y), mirroring the top panel.
 *
 * Returned as a Manifold (not a BufferGeometry) because the caller unions it
 * with the rest of the frame before converting to geometry.
 */
export function buildBase(L: CubeLayout): Manifold {
  return buildPanelRing(L, L.baseCenterZ, L.baseThickness);
}
