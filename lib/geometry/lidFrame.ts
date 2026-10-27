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
 * It has corner blocks continuing the posts (grooves included), a skirt along
 * each face that hangs over the side panels' top edges from outside, and a top
 * plate whose underside has a cross-shaped recess for the top panel, which
 * rests on the side-panel tops and is trapped there.
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
  const { C, half, clear, cornerReach, corners, lidRing, lidRecess, postTop, panelTop, panelOuter } = L;
  const inner = half - cornerReach; // post inner face = edge of the lid opening

  const cornerBlocks = corners.map(([sx, sy]) =>
    mBox(cornerReach, cornerReach, half - postTop,
      sx * (half - cornerReach / 2), sy * (half - cornerReach / 2), (postTop + half) / 2));
  // The plate reaches eps down into the rails so the union fuses one body.
  const plate = mBox(C, C, lidRing + eps, 0, 0, panelTop + (lidRing - eps) / 2);
  // Skirts hang over the side-panel top edges from outside; no inner wall,
  // because the top panel reaches out over those edges.
  const skirtInner = panelOuter + clear;
  const body = mUnionAll([...cornerBlocks, plate, ...faceRails(L, postTop, panelTop, skirtInner)]);

  const opening = mBox(2 * inner, 2 * inner, C, 0, 0, half);
  // Cross-shaped recess: two arms that reach the side panels' outer faces,
  // stopping at the post inner faces so the corner blocks stay solid.
  // Starts 2·eps below panelTop: the plate's underside sits at panelTop − eps,
  // and a coplanar cutter face there leaves zero-volume slivers.
  const recessH = lidRecess + 2 * eps;
  const recessZ = panelTop - 2 * eps + recessH / 2;
  const reach = 2 * (panelOuter + clear);
  const cuts = [
    opening,
    mBox(2 * inner, reach, recessH, 0, 0, recessZ),
    mBox(reach, 2 * inner, recessH, 0, 0, recessZ),
    ...panelSlotCutters(L, postTop, panelTop, false),
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
