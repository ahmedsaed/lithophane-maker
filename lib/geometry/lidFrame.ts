import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import {
  mBox,
  mUnionAll,
  mSubtract,
  manifoldToGeometry,
} from './mCsg';

/**
 * Lid frame — a flat square ring that caps the open top of the cube.
 *
 * The top panel slides in horizontally from the front (−Y direction).
 * The front rail is omitted. The three closed sides (back +Y, right +X, left −X)
 * have a groove cut into their inner face: a channel with a top wall, a gap
 * (= t + 2*clear) for the panel edge to slide in, and a bottom wall.
 *
 * Lid thickness is derived so there is always a minWall of material above and
 * below the groove — it will be thicker than bottomThickness when the panel is thick.
 *
 * Print orientation: face-down on the build plate. No overhangs.
 */
export function buildLidFrame(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, t, clear, engage, cornerReach, corners } = L;

  const eps     = 0.02;
  const slotW   = t + 2 * clear;            // groove gap height in Z
  const slotD   = engage + clear;           // groove depth into the rail (radially)
  const minWall = Math.max(1.5, t * 0.5);  // minimum wall above/below groove

  // Lid is thick enough to hold walls on both sides of the groove.
  const lidThickness = slotW + 2 * minWall;
  const lidCenterZ   = half + lidThickness / 2;

  // ── Corner blocks ──────────────────────────────────────────────────────────
  const cornerBlocks = corners.map(([sx, sy]) =>
    mBox(
      cornerReach,
      cornerReach,
      lidThickness,
      sx * (half - cornerReach / 2),
      sy * (half - cornerReach / 2),
      lidCenterZ,
    ),
  );

  // ── Side rails (three closed sides; front −Y is open for panel insertion) ──
  const railSpan = C - 2 * cornerReach;

  const sideRails = [
    mBox(railSpan, cornerReach, lidThickness,  0,                        half - cornerReach / 2, lidCenterZ), // back  +Y
    mBox(cornerReach, railSpan, lidThickness,  half - cornerReach / 2,  0,                       lidCenterZ), // right +X
    mBox(cornerReach, railSpan, lidThickness, -half + cornerReach / 2,  0,                       lidCenterZ), // left  −X
  ];

  let ring = mUnionAll([...cornerBlocks, ...sideRails]);

  // ── Groove cutters ─────────────────────────────────────────────────────────
  // Each groove is a horizontal channel on the inner face of its rail.
  // Cross-section (viewed from inner face):
  //   height in Z = slotW  (t + 2*clear) — the gap the panel edge slides into
  //   depth       = slotD  (engage + clear) — how far into the rail it reaches
  // The groove is centred vertically on the lid (at lidCenterZ), leaving
  // minWall of material on both the top and bottom faces.
  //
  // Inner-face distance from cube centre (the groove mouth sits here).
  const innerEdge = half - cornerReach;

  // Left/right grooves run from the open front face (Y = −half) to the back
  // inner face (Y = +innerEdge) only — the back rail needs no groove.
  // Span length = half + innerEdge = C − cornerReach, centred at −cornerReach/2.
  const grooveSpanY  = C - cornerReach + 2 * eps;
  const grooveCentreY = -cornerReach / 2;

  const grooveCutters = [
    // right (+X) inner face: groove runs along Y, stops at back inner face
    mBox(slotD, grooveSpanY, slotW,  innerEdge + slotD / 2, grooveCentreY, lidCenterZ),
    // left  (−X) inner face: groove runs along Y, stops at back inner face
    mBox(slotD, grooveSpanY, slotW, -innerEdge - slotD / 2, grooveCentreY, lidCenterZ),
  ];

  ring = mSubtract(ring, mUnionAll(grooveCutters));

  return manifoldToGeometry(ring);
}
