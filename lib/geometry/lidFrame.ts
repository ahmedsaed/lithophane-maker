import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout, type CubeLayout } from './layout';
import { chamferCutters } from './chamfer';
import type { Mat4 } from 'manifold-3d';
import {
  mBox,
  mExtrudePrism,
  mUnionAll,
  mSubtract,
  manifoldToGeometry,
  type Manifold,
} from './mCsg';

/**
 * Shared square ring with three closed sides (back +Y, right +X, left −X) and
 * an open front (−Y). Each closed side carries a horizontal groove on its inner
 * face that receives a slide-in lithophane panel.
 *
 * Used by both the lid (above the cube) and the fused base (below the cube):
 * they are identical apart from their centre Z and the lid's snap tabs.
 *
 * `bridgeSide` ties the two front arms together with a thin wall spanning the
 * front opening, on the build-plate face only (so it needs no supports): +1
 * bridges the top face (lid, printed upside-down), −1 the bottom face (base,
 * printed bottom-down). The bridge fills the front opening's build-plate-side
 * wall up to the groove floor; the panel slides in above it and the plug
 * (shortened to match) seats on top of it.
 */
export function buildPanelRing(
  L: CubeLayout,
  centerZ: number,
  thickness: number,
  bridgeSide: 1 | -1,
): Manifold {
  const { C, half, t, clear, engage, cornerReach, corners, topPanelW, panelOffset } = L;

  const eps     = 0.02;
  const slotW   = t + 2 * clear;            // groove gap height in Z
  const slotD   = engage + clear;           // groove depth into the rail (radially)
  const minWall = (thickness - slotW) / 2;  // wall above/below the groove

  // ── Corner blocks ──────────────────────────────────────────────────────────
  const cornerBlocks = corners.map(([sx, sy]) =>
    mBox(
      cornerReach,
      cornerReach,
      thickness,
      sx * (half - cornerReach / 2),
      sy * (half - cornerReach / 2),
      centerZ,
    ),
  );

  // ── Side rails (three closed sides; front −Y is open for panel insertion) ──
  const railSpan = C - 2 * cornerReach;

  const sideRails = [
    mBox(railSpan, cornerReach, thickness,  0,                        half - cornerReach / 2, centerZ), // back  +Y
    mBox(cornerReach, railSpan, thickness,  half - cornerReach / 2,  0,                       centerZ), // right +X
    mBox(cornerReach, railSpan, thickness, -half + cornerReach / 2,  0,                       centerZ), // left  −X
  ];

  // ── Anti-wobble bridge ──────────────────────────────────────────────────────
  // Spans the open front (−Y) between the two front corner blocks, filling the
  // build-plate-side wall up to the groove floor. minWall tall, at the same
  // depth as the front corner blocks. Ties the front arms together for rigidity
  // and prints support-free because it sits flat on the build plate.
  const frontBridge = mBox(
    railSpan, cornerReach, minWall,
    0, -half + cornerReach / 2,
    centerZ + bridgeSide * (slotW / 2 + minWall / 2),
  );

  // ── Tongue-hiding lips ──────────────────────────────────────────────────────
  // Each closed rail grows a thin shelf reaching `engage` toward the cube centre,
  // sitting in the recess just outboard of its side panel. This hides the side
  // panels' top/bottom tongues behind a face flush with the cube exterior —
  // exactly how the corner posts hide their left/right tongues. The lid presses
  // straight down so the shelf clears the panel (it sits in the outboard recess).
  // The front (−Y) panel's tongue is hidden by the plug instead (see plug.ts).
  const cubeFaceZ   = centerZ - bridgeSide * thickness / 2; // ring edge nearest the cube
  const lipCenterZ  = cubeFaceZ - bridgeSide * engage / 2;  // shelf centred over the tongue
  const recessThk   = half - (panelOffset + t / 2 + clear); // gap outboard of the panel face
  const shelfCentre = (panelOffset + t / 2 + clear + half) / 2;

  const tongueLips = recessThk > 0 ? [
    mBox(railSpan, recessThk, engage, 0,            shelfCentre, lipCenterZ),  // back  +Y
    mBox(recessThk, railSpan, engage, shelfCentre,  0,           lipCenterZ),  // right +X
    mBox(recessThk, railSpan, engage, -shelfCentre, 0,           lipCenterZ),  // left  −X
  ] : [];

  let ring = mUnionAll([...cornerBlocks, ...sideRails, frontBridge, ...tongueLips]);

  // ── Groove cutters ─────────────────────────────────────────────────────────
  // Each groove is a horizontal channel on the inner face of its rail.
  // Cross-section (viewed from inner face):
  //   height in Z = slotW  (t + 2*clear) — the gap the panel edge slides into
  //   depth       = slotD  (engage + clear) — how far into the rail it reaches
  // The groove is centred vertically on the ring (at centerZ), leaving
  // minWall of material on both faces.
  const innerEdge = half - cornerReach;

  // Left/right grooves run from the open front face (Y = −half) past the back
  // inner face (Y = +innerEdge) all the way to the back tongue stop
  // (Y = innerEdge + engage). This lets the panel's left/right edges ride
  // through the back-corner-block area so the panel centres at Y = 0.
  const grooveSpanY   = half + innerEdge + engage + 2 * eps;
  const grooveCentreY = (innerEdge + engage - half) / 2;

  // Extend by 2*eps in the radial direction so the cutter breaks through the
  // inner-face plane instead of being coplanar with it.
  const grooveCutters = [
    // right (+X) inner face: groove runs along Y through back-right corner block
    mBox(slotD + 2 * eps, grooveSpanY, slotW,  innerEdge + slotD / 2, grooveCentreY, centerZ),
    // left  (−X) inner face: groove runs along Y through back-left corner block
    mBox(slotD + 2 * eps, grooveSpanY, slotW, -innerEdge - slotD / 2, grooveCentreY, centerZ),
    // back  (+Y) inner face: groove runs along X, accepts the panel's back tongue.
    mBox(topPanelW + 2 * eps, slotD + 2 * eps, slotW, 0, innerEdge + slotD / 2, centerZ),
  ];

  // ── Snap pockets ───────────────────────────────────────────────────────────
  // Small rectangular pockets cut into the top and bottom walls of the left and
  // right panel grooves, just inside the front opening. The plug tongue ridges
  // click into these when the plug is pushed home (see plug.ts).
  //
  //   snapOffset — distance from the ring front face to the pocket centre in Y
  //   snapW      — pocket width in Y
  //   snapDepth  — how far the pocket cuts into the groove wall (in Z)
  // Dimensions match the triangular ridge in plug.ts:
  //   ridgeProtrusion = 0.12 mm  →  ridgeH = 2×0.12/√3 ≈ 0.139 mm
  //   snapDepth = ridgeProtrusion (pocket exactly as deep as ridge tip)
  //   snapW     = ridgeH + 2×clear  (ridge base + clearance either side in Y)
  const snapOffset = 2.0;
  const snapRidgeP = 0.12;                            // plug ridge protrusion (from plug.ts)
  const snapRidgeH = snapRidgeP * 2 / Math.sqrt(3);   // equilateral base height
  const snapW      = snapRidgeH + 2 * clear;
  const snapDepth  = snapRidgeP;
  const snapCentY  = -(half - snapOffset);
  const snapTopZ   = centerZ + slotW / 2 + snapDepth / 2;
  const snapBotZ   = centerZ - slotW / 2 - snapDepth / 2;

  const snapPockets = [
    mBox(slotD, snapW, snapDepth,  innerEdge + slotD / 2, snapCentY, snapTopZ),  // right, top
    mBox(slotD, snapW, snapDepth,  innerEdge + slotD / 2, snapCentY, snapBotZ),  // right, bottom
    mBox(slotD, snapW, snapDepth, -innerEdge - slotD / 2, snapCentY, snapTopZ),  // left,  top
    mBox(slotD, snapW, snapDepth, -innerEdge - slotD / 2, snapCentY, snapBotZ),  // left,  bottom
  ];

  return mSubtract(ring, mUnionAll([...grooveCutters, ...snapPockets]));
}

/**
 * Lid frame — a flat square ring that caps the open top of the cube.
 *
 * The top panel slides in horizontally from the front (−Y direction).
 * The front rail is omitted. The three closed sides (back +Y, right +X, left −X)
 * have a groove cut into their inner face: a channel with a top wall, a gap
 * (= t + 2*clear) for the panel edge to slide in, and a bottom wall.
 *
 * Lid thickness is derived so there is always a minWall of material above and
 * below the groove.
 *
 * Print orientation: face-down on the build plate. No overhangs.
 */
export function buildLidFrame(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { halfZ, clear, engage, corners, lidThickness, lidCenterZ } = L;

  const slotD = engage + clear;  // groove depth into the rail (radially)

  // Lid prints upside-down, so its top face is on the build plate → bridge +Z.
  let ring = buildPanelRing(L, lidCenterZ, lidThickness, 1);

  // ── Alignment tabs ─────────────────────────────────────────────────────────
  // Four square pegs protruding downward from the lid underside (Z = halfZ → halfZ−tabH).
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
  const tabH        = L.tabHeight;
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
  const ridgeZ          = halfZ - tabH + ridgeSize;            // centre Z of groove in frame.ts

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
      // mExtrudePrism always centres the extrusion on local Z (depth/2 each side),
      // so the translation must be the CENTRE of the extrusion range — no ±ridgeW/2 offset.
      const ridgeX = mExtrudePrism(triRidge, ridgeW,
        [sx, 0, 0, 0,  0, 0, 1, 0,  0, -sx, 0, 0,
         sx * outerEdge, sy * tabCentDist, ridgeZ - ridgeH / 2, 1,
        ] as unknown as Mat4);

      // Ridge on sy outer face — extrudes along sy·X, height along +Z, protrudes in sy·Y.
      // Col-major Mat4: col0=local-X→sy·Y, col1=local-Y→+Z, col2=local-Z→sy·X
      const ridgeY = mExtrudePrism(triRidge, ridgeW,
        [0, sy, 0, 0,  0, 0, 1, 0,  sy, 0, 0, 0,
         sx * tabCentDist, sy * outerEdge, ridgeZ - ridgeH / 2, 1,
        ] as unknown as Mat4);

      return [
        mBox(tabSize, tabSize, tabH, sx * tabCentDist, sy * tabCentDist, halfZ - tabH / 2),
        ridgeX,
        ridgeY,
      ];
    });
    ring = ring.add(mUnionAll(tabsAndRidges));
  }

  // Bevel the exterior frame edge around each panel. The lid owns the side panels'
  // top borders (its lips) and the top panel's borders, so it subtracts the four
  // side cutters + the top.
  if (params.chamfer) {
    ring = mSubtract(ring, mUnionAll(chamferCutters(L, 1)));
  }

  return manifoldToGeometry(ring);
}
