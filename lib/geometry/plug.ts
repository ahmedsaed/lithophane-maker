import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import type { Mat4 } from 'manifold-3d';
import { mBox, mUnionAll, mExtrudePrism, manifoldToGeometry } from './mCsg';

/**
 * Plug that closes the front opening of a panel ring after the lithophane
 * panel has been slid into place.
 *
 * The geometry is symmetric in Z (body and tongues centred at z=0, ridge pairs
 * mirrored top/bottom), so a single part serves both the lid (above the cube)
 * and the fused base (below it) — only its assembled Z position differs.
 *
 * Main body: exact fit, no clearance — presses snugly into the opening.
 * Side tongues: exact fit (slotW tall) — ride in the left/right panel grooves.
 * Snap ridges: equilateral-triangle prisms on the tongue top/bottom faces,
 *   matching the pockets cut into the groove walls in buildPanelRing (lidFrame.ts).
 *
 * Print orientation: widest face flat on the bed.
 */
export function buildPlug(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, t, clear, engage, cornerReach, lidThickness } = L;
  const slotW     = t + 2 * clear;
  const innerEdge = half - cornerReach;
  const railW     = C - 2 * cornerReach;
  const minWall   = (lidThickness - slotW) / 2;  // = baseThickness; wall above/below groove

  // ── Main body ──────────────────────────────────────────────────────────────
  // The ring's front bridge fills one wall of the opening (the build-plate side),
  // so the plug omits that wall and seats on top of the bridge. Canonical
  // orientation omits the +Z (top) wall → matches the lid (bridge on top);
  // buildPlugInPlace flips it 180° about Y for the base (bridge on the bottom).
  const bodyW = railW;
  const bodyH = lidThickness - minWall;  // groove + the non-bridge wall
  const bodyD = cornerReach;
  const bodyZ = -minWall / 2;            // shifted down, leaving the top wall to the bridge
  const body  = mBox(bodyW, bodyD, bodyH, 0, 0, bodyZ);

  // ── Side tongues: exact fit ────────────────────────────────────────────────
  const tongueW  = engage + clear;          // = slotD  (fills groove width)
  const tongueH  = slotW;                   // fills groove height (ridge provides snap)
  const tongueD  = bodyD;
  const tongueCX = innerEdge + tongueW / 2; // centred in groove

  const rightTongue = mBox(tongueW, tongueD, tongueH,  tongueCX, 0, 0);
  const leftTongue  = mBox(tongueW, tongueD, tongueH, -tongueCX, 0, 0);

  // ── Snap ridges (equilateral 60° triangle prisms) ─────────────────────────
  // Equilateral cross-section: base flush with tongue face, apex at ridgeProtrusion.
  //   ridgeH = 2 × ridgeProtrusion / √3  (equilateral constraint)
  // The ridge tip protrudes ridgeProtrusion past the groove wall.  The ring groove
  // wall flexes that amount until the ridge aligns with the pocket and snaps in.
  //
  // Profile (in local XY — local X = protrusion direction, local Y = ridge height):
  //   [0, 0]                  → base bottom, flush with tongue face
  //   [ridgeProtrusion, h/2]  → apex, maximum protrusion at mid-height
  //   [0, h]                  → base top, flush with tongue face
  //
  // Each ridge is extruded along the tongue-width axis (X) — col-major Mat4:
  //   col0 → protrusion direction (±Z)
  //   col1 → ridge-height direction (+Y, along tongue depth)
  //   col2 → extrusion direction (±X, along tongue width)
  //   col3 → base position (centre of ridge in X, start of ridge in Y, tongue face in Z)
  const ridgeProtrusion = 0.12;  // must match snapRidgeP in lidFrame.ts buildPanelRing
  const ridgeH          = ridgeProtrusion * 2 / Math.sqrt(3);
  const ridgeW          = tongueW - 2 * clear;

  const snapOffset  = 2.0;                         // mm from plug front face to ridge centre Y
  const ridgeCentY  = -bodyD / 2 + snapOffset;     // in plug local coords (Y=0 = body centre)
  const ridgeStartY = ridgeCentY - ridgeH / 2;     // translation Y so ridge centre is ridgeCentY

  const tri: Array<[number, number]> = [
    [0,               0          ],
    [ridgeProtrusion, ridgeH / 2 ],
    [0,               ridgeH     ],
  ];

  // Right tongue — top face (+Z protrusion, +X extrusion)
  const rTop = mExtrudePrism(tri, ridgeW,
    [0, 0, 1, 0,   0, 1, 0, 0,   1, 0, 0, 0,   tongueCX, ridgeStartY,  tongueH / 2, 1] as unknown as Mat4);
  // Right tongue — bottom face (−Z protrusion, +X extrusion)
  const rBot = mExtrudePrism(tri, ridgeW,
    [0, 0, -1, 0,  0, 1, 0, 0,   1, 0, 0, 0,   tongueCX, ridgeStartY, -tongueH / 2, 1] as unknown as Mat4);
  // Left tongue — top face (+Z protrusion, −X extrusion)
  const lTop = mExtrudePrism(tri, ridgeW,
    [0, 0, 1, 0,   0, 1, 0, 0,  -1, 0, 0, 0,  -tongueCX, ridgeStartY,  tongueH / 2, 1] as unknown as Mat4);
  // Left tongue — bottom face (−Z protrusion, −X extrusion)
  const lBot = mExtrudePrism(tri, ridgeW,
    [0, 0, -1, 0,  0, 1, 0, 0,  -1, 0, 0, 0,  -tongueCX, ridgeStartY, -tongueH / 2, 1] as unknown as Mat4);

  return manifoldToGeometry(mUnionAll([body, rightTongue, leftTongue, rTop, rBot, lTop, lBot]));
}

/**
 * Plug positioned in a ring's front opening, in assembled cube coordinates.
 * `centerZ` is the ring's groove-slot centre (lidCenterZ or baseCenterZ).
 *
 * The canonical plug omits its top wall (for the lid, whose bridge is on top).
 * For the base, set `flip` to rotate it 180° about the Y (insertion) axis so the
 * omitted wall faces down onto the base's bottom bridge. The plug is symmetric
 * in X and its ridges sit on the Y axis of rotation, so the same printed part
 * serves both — you just flip it when fitting the base.
 */
export function buildPlugInPlace(params: Params, centerZ: number, flip = false): BufferGeometry {
  const L = cubeLayout(params);
  const { half, cornerReach } = L;

  const geom = buildPlug(params);
  if (flip) geom.rotateY(Math.PI);
  geom.translate(0, -half + cornerReach / 2, centerZ);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}
