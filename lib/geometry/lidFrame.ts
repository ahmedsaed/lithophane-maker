import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import type { Mat4 } from 'manifold-3d';
import {
  mBox,
  mExtrudePrism,
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

  // ── Alignment tabs ─────────────────────────────────────────────────────────
  // Four square pegs protruding downward from the lid underside (Z = half → half−tabH).
  // Each peg drops into the inner-corner-removal pocket that frame.ts cuts at each
  // corner post (the square void at sx*gi, sy*gi that clears groove intersections).
  //
  // gi        = grooveCenter − guideDepth/2   (pocket centre, mirrors frame.ts)
  // grooveD   = slotD + guideDepth            (pocket size in frame, ~7.3 mm)
  // tabSize   = grooveD − 2*clear             (fits inside pocket with clearance)
  // Tab occupies only the portion of the inner-corner pocket that lies inside
  // the post walls: from post inner face (half − cornerReach) to pocket outer
  // edge (gi + grooveD/2). That span equals slotD, centred at grooveCenter.
  const tabSize     = slotD;
  const tabCentDist = L.grooveCenter;
  const tabH        = params.bottomThickness;
  // Outer face of each tab = the pocket wall it presses against.
  const outerEdge   = L.grooveCenter + slotD / 2;

  // Snap ridges: triangular prism on each outer face of the tab.
  // Cross-section (radial-Z plane): right triangle with pointed bottom (easy
  // entry) and horizontal top face (catches in the groove when snapped in).
  //   (0,0)            → base, flush with tab face, at ridge bottom Z
  //   (ridgeSize, ridgeSize) → tip: maximum protrusion, at ridge top Z
  //   (0, ridgeSize)   → base, flush with tab face, at ridge top Z
  // The rectangular groove in the frame pocket wall already accommodates this
  // triangle (same bounding box), so frame.ts needs no changes.
  const ridgeSize       = 0.5;
  const ridgeProtrusion = ridgeSize * 0.2;                     // 80% smaller radial depth → 0.1 mm
  const ridgeH          = ridgeProtrusion * 2 / Math.sqrt(3);  // equilateral height for that protrusion
  const ridgeW          = slotD / 2;
  const ridgeZ          = half - tabH + ridgeSize;             // centre Z of groove in frame.ts

  // Equilateral triangle (all angles 60°): pointed bottom and top ramps make it
  // equally easy to snap in and release.  Tip is centred in Z.
  const triRidge: Array<[number, number]> = [
    [0,              0       ],   // base bottom, flush with tab face
    [ridgeProtrusion, ridgeH / 2], // apex — max protrusion, at mid-height
    [0,              ridgeH  ],   // base top, flush with tab face
  ];

  if (tabSize > 0) {
    const tabsAndRidges = corners.flatMap(([sx, sy]) => {
      // Ridge on sx outer face — extrudes along −sx·Y, height along +Z, protrudes in sx·X.
      // Col-major Mat4: col0=local-X→sx·X, col1=local-Y→+Z, col2=local-Z→−sx·Y
      const ridgeX = mExtrudePrism(triRidge, ridgeW,
        [sx, 0, 0, 0,  0, 0, 1, 0,  0, -sx, 0, 0,
         sx * outerEdge, sy * tabCentDist + sx * ridgeW / 2, ridgeZ - ridgeH / 2, 1,
        ] as unknown as Mat4);

      // Ridge on sy outer face — extrudes along sy·X, height along +Z, protrudes in sy·Y.
      // Col-major Mat4: col0=local-X→sy·Y, col1=local-Y→+Z, col2=local-Z→sy·X
      const ridgeY = mExtrudePrism(triRidge, ridgeW,
        [0, sy, 0, 0,  0, 0, 1, 0,  sy, 0, 0, 0,
         sx * tabCentDist - sy * ridgeW / 2, sy * outerEdge, ridgeZ - ridgeH / 2, 1,
        ] as unknown as Mat4);

      return [
        mBox(tabSize, tabSize, tabH, sx * tabCentDist, sy * tabCentDist, half - tabH / 2),
        ridgeX,
        ridgeY,
      ];
    });
    ring = ring.add(mUnionAll(tabsAndRidges));
  }

  return manifoldToGeometry(ring);
}
