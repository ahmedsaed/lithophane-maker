import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import type { Mat4 } from 'manifold-3d';
import { mBox, mUnionAll, mExtrudePrism, manifoldToGeometry } from './mCsg';

/**
 * Plug that closes the front opening of the lid frame after the top panel
 * has been slid into place.
 *
 * Main body: exact fit, no clearance — presses snugly into the opening.
 * Side tongues: exact fit (slotW tall) — ride in the left/right panel grooves.
 * Snap ridges: equilateral-triangle prisms on the tongue top/bottom faces,
 *   matching the pockets cut into the groove walls in lidFrame.ts.
 *
 * Print orientation: widest face flat on the bed.
 */
export function buildLidPlug(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, t, clear, engage, cornerReach, lidThickness } = L;
  const slotW     = t + 2 * clear;
  const innerEdge = half - cornerReach;
  const railW     = C - 2 * cornerReach;

  // ── Main body: exact fit ───────────────────────────────────────────────────
  const bodyW = railW;
  const bodyH = lidThickness;
  const bodyD = cornerReach;
  const body  = mBox(bodyW, bodyD, bodyH, 0, 0, 0);

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
  // The ridge tip protrudes ridgeProtrusion past the groove wall.  The lid groove
  // wall flexes that amount until the ridge aligns with the pocket and snaps in.
  //
  // Sized at 70% of the original rectangular snap (was 0.4 mm deep, 1.5 mm wide):
  //   ridgeProtrusion = 0.4 × 0.3 = 0.12 mm
  //   ridgeW (extrusion) = tongueW − 2×clear  (slightly narrower than groove width)
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
  const ridgeProtrusion = 0.12;
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

/** Plug positioned in the lid's front opening in assembled cube coordinates. */
export function buildLidPlugInPlace(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { half, cornerReach, lidCenterZ } = L;

  const geom = buildLidPlug(params);
  geom.translate(0, -half + cornerReach / 2, lidCenterZ);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}
