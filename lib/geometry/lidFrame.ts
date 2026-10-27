import type { BufferGeometry } from 'three';
import type { Params } from './types';
import { cubeLayout } from './layout';
import { faceRails, panelSlotCutters } from './frame';
import {
  mBox,
  mCylinderZ,
  mFrustumZ,
  mSubtract,
  mUnion,
  mUnionAll,
  manifoldToGeometry,
  withManifoldScope,
} from './mCsg';

const eps = 0.02;
/** Height of the tapered lead-in at each peg tip, and how much narrower the tip is (mm). */
const PEG_LEAD_IN = 0.6;
const PEG_TIP_INSET = 0.4;

/**
 * Lid — the top band of the cube, `cornerReach` tall so every side face shows
 * a frame of equal width on all four edges, and the top face a matching ring.
 *
 * It has corner blocks continuing the posts (grooves included), skirts with a
 * groove for each side panel's top border, mirroring the frame's bottom rails,
 * and a top plate with a square recess underneath. The top panel rests on the
 * frame's corner supports, which rise into pockets in the corner blocks, and
 * the plate traps it from above.
 * The corner blocks sit on the post tops and attach either with press-fit pegs
 * that drop into holes in the posts, or with disc magnets glued into both.
 *
 * Built in assembled position (top face at Z = +half). Use buildLidForPrint for
 * export: it is printed face-down, so the grooves, recess and pegs face up.
 */
export function buildLidFrame(params: Params): BufferGeometry {
  return withManifoldScope(() => buildLidFrameScoped(params));
}

function buildLidFrameScoped(params: Params): BufferGeometry {
  const L = cubeLayout(params);
  const { C, half, clear, cornerReach, corners, lidRing, lidRecess, postTop, topPanelBase, panelEdge, windowHalf } = L;

  const cornerBlocks = corners.map(([sx, sy]) =>
    mBox(cornerReach, cornerReach, half - postTop,
      sx * (half - cornerReach / 2), sy * (half - cornerReach / 2), (postTop + half) / 2));
  // The plate reaches eps down into the skirts so the union fuses one body.
  const plate = mBox(C, C, lidRing + eps, 0, 0, topPanelBase + (lidRing - eps) / 2);
  // Skirts are the same rails as the frame's bottom band, so the side panels'
  // top borders sit in a full groove, mirroring the bottom.
  const body = mUnionAll([...cornerBlocks, plate, ...faceRails(L, postTop, topPanelBase)]);

  const opening = mBox(2 * windowHalf, 2 * windowHalf, C, 0, 0, half);
  // Square recess for the top panel (the same square as every panel).
  // Starts 2·eps below topPanelBase: the plate's underside sits at
  // topPanelBase − eps, and a coplanar cutter face there leaves zero-volume slivers.
  const recessH = lidRecess + 2 * eps;
  const recessZ = topPanelBase - 2 * eps + recessH / 2;
  const recess = 2 * (panelEdge + clear);
  // Pockets over the frame's corner supports, `clear` wider so the lid lowers
  // past them; they open into the recess above.
  const pocket = panelEdge + clear - windowHalf + eps;
  const pocketH = topPanelBase - postTop + 2 * eps;
  const pockets = corners.map(([sx, sy]) =>
    mBox(pocket, pocket, pocketH,
      sx * (windowHalf - eps + pocket / 2), sy * (windowHalf - eps + pocket / 2), (postTop + topPanelBase) / 2));
  const cuts = [
    opening,
    mBox(recess, recess, recessH, 0, 0, recessZ),
    ...pockets,
    // The side panels' top borders rise `engage` above the window; the groove
    // leaves `clear` above them.
    ...panelSlotCutters(L, postTop, panelEdge + clear),
  ];

  const pegs = [];
  for (const [sx, sy] of corners) {
    const x = sx * L.attachOffset;
    const y = sy * L.attachOffset;
    if (params.lidAttach === 'magnet') {
      cuts.push(mCylinderZ(L.attachHoleD / 2, 2 * L.postHoleDepth, x, y, postTop, 48));
    } else {
      // Peg reaches eps up into the lid so it fuses; the tip tapers for an easy start.
      const r = L.attachHoleD / 2 - params.pegClearance;
      const shaftH = params.pegDepth - PEG_LEAD_IN + eps;
      pegs.push(mCylinderZ(r, shaftH, x, y, postTop + eps - shaftH / 2, 48));
      pegs.push(mFrustumZ(r - PEG_TIP_INSET, r, PEG_LEAD_IN + eps, x, y,
        postTop - params.pegDepth + PEG_LEAD_IN / 2 + eps / 2, 48));
    }
  }

  let lid = mSubtract(body, mUnionAll(cuts));
  if (pegs.length) lid = mUnion(lid, mUnionAll(pegs));
  return manifoldToGeometry(lid);
}

/** The lid flipped face-down onto the bed (Z = 0), ready to slice. */
export function buildLidForPrint(params: Params): BufferGeometry {
  const g = buildLidFrame(params);
  g.rotateX(Math.PI);
  g.computeBoundingBox();
  g.translate(0, 0, -g.boundingBox!.min.z);
  g.computeVertexNormals();
  return g;
}
