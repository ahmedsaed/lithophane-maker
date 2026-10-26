import type { Params, PanelSlot } from './types';

/**
 * Derived dimensions shared by the frame and side panels so every part fits.
 * Cube is centred at the origin, edges along X/Y/Z, spanning ±cubeSize/2.
 * Z is up. Side faces are ±X and ±Y; the bottom (−Z) is a solid floor printed
 * with the frame. Every face is framed by a band `cornerReach` wide: the posts
 * at the sides, a rail along the floor at the bottom and the lid at the top,
 * so each panel shows a square image window. The lid is the top `cornerReach`
 * of the frame; the posts stop there.
 */
export interface CubeLayout {
  C: number; // cube outer size
  half: number; // C/2
  p: number; // nominal post size
  t: number; // side-panel thickness
  clear: number; // groove clearance per side
  engage: number; // how deep a tongue sits inside a groove
  /** Square corner-post footprint leg length along each face. */
  cornerReach: number;
  bottomThickness: number;
  /** Distance of a side-panel mid-plane from the cube centre. */
  panelOffset: number;
  /** Side panel footprint (horizontal x vertical). */
  sidePanelW: number;
  sidePanelH: number;
  /** Centre Z of a side panel (its plate). */
  sidePanelCenterZ: number;
  /** Rail extrusion width — post-inner-face to post-inner-face, avoids corner posts. */
  railW: number;
  /** Centre of each groove from the cube centre, along the face's width axis. */
  grooveCenter: number;
  /** Corner signs in the XY plane. */
  corners: Array<[number, number]>;
  /** Lid height = cornerReach: the top band of every face. */
  lidThickness: number;
  /** Lid top-plate thickness: lip over the top panel plus the recess the panel sits in. */
  lidRing: number;
  /** Solid lid material above the top panel. */
  lidLip: number;
  /** Depth of the top-panel recess on the lid underside. */
  lidRecess: number;
  /** Z of the post tops, where the lid sits. */
  postTop: number;
  /** Z of the side-panel tops, where the top panel rests. */
  panelTop: number;
  /** Half-size of the square image window on every face (= post inner face). */
  windowHalf: number;
  /** Inner face of the bottom rails and lid rails that form the top/bottom grooves. */
  railInner: number;
  /** Outer face of the side panels — the top panel and its recess reach this far. */
  panelOuter: number;
  /** Top panel footprint (square, corners notched around the posts). */
  topPanelW: number;
  topPanelD: number;
  /** Size of the square notch cut from each top-panel corner to clear a post. */
  topNotch: number;
  /** Side of the solid square at each post's outer corner, clear of the grooves. */
  postCornerSolid: number;
  /** Distance of each peg / magnet axis from the cube centre along X and Y. */
  attachOffset: number;
  /** Diameter of the peg / magnet hole in the post tops and lid corners. */
  attachHoleD: number;
  /** Depth of that hole in the post tops. */
  postHoleDepth: number;
}

/** Gap above the top panel inside the lid recess (mm). */
export const LID_RECESS_GAP = 0.2;
/** Wall on the inner side of the top and bottom panel grooves (mm). */
export const RAIL_INNER_WALL = 2;
/** Extra diameter and depth given to magnet holes so magnets press or glue in (mm). */
export const MAGNET_FIT = 0.2;
/** Extra post-hole depth below a peg tip so the peg bottoms out on the lid, not the hole (mm). */
export const PEG_HOLE_EXTRA = 0.5;

/** Wall left around a press-fit peg hole in the post (mm). */
export const MIN_ATTACH_WALL = 1.2;

export function cubeLayout(params: Params): CubeLayout {
  const C = params.cubeSize;
  const half = C / 2;
  const p = params.postSize;
  const t = params.panelThickness;
  const clear = params.grooveClearance;
  const engage = Math.min(params.tongueWidth, p * 0.7);

  const cornerReach = Math.min(p * 1.8, C * 0.35);

  // Recess the top panel exactly as far below the top face as the side panels
  // sit behind theirs (p/2 − t/2), so all five faces look the same.
  const lidLip = p / 2 - t / 2 - LID_RECESS_GAP;
  const lidRecess = t + LID_RECESS_GAP;
  const lidRing = lidLip + lidRecess;
  const lidThickness = cornerReach;
  const postTop = half - lidThickness;
  const panelTop = half - lidRing;
  const windowHalf = half - cornerReach;

  const panelOffset = half - p / 2; // recessed inside the posts
  const sidePanelW = C - 2 * cornerReach + 2 * engage;
  // Panels stand on the floor top and reach up into the lid, under the top panel.
  const floorTop = -half + params.bottomThickness;
  const sidePanelH = panelTop - floorTop;
  const sidePanelCenterZ = (panelTop + floorTop) / 2;
  const railInner = panelOffset - t / 2 - clear - RAIL_INNER_WALL;
  const grooveCenter = half - cornerReach + (engage + clear) / 2;

  const railW = C - 2 * cornerReach; // post-inner-face to post-inner-face

  // Top panel: rests on the side-panel top edges, reaching their outer faces,
  // with each corner notched to clear a post (plus clearance).
  const panelOuter = panelOffset + t / 2;
  const topPanelW = 2 * panelOuter;
  const topPanelD = topPanelW;
  const topNotch = panelOuter - (half - cornerReach) + clear;

  // Pegs / magnets sit in the solid square at each post's outer corner, which
  // starts where the grooves and the inner-corner pocket end.
  const postCornerSolid = cornerReach - engage - clear;
  const attachOffset = half - postCornerSolid / 2;
  const pegHoleD = postCornerSolid - 2 * MIN_ATTACH_WALL;
  const attachHoleD = params.lidAttach === 'magnet'
    ? params.magnetDiameter + MAGNET_FIT
    : pegHoleD;
  const postHoleDepth = params.lidAttach === 'magnet'
    ? params.magnetHeight + MAGNET_FIT
    : params.pegDepth + PEG_HOLE_EXTRA;

  const corners: Array<[number, number]> = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  return {
    C,
    half,
    p,
    t,
    clear,
    engage,
    cornerReach,
    bottomThickness: params.bottomThickness,
    panelOffset,
    sidePanelW,
    sidePanelH,
    sidePanelCenterZ,
    railW,
    grooveCenter,
    corners,
    lidThickness,
    lidRing,
    lidLip,
    lidRecess,
    postTop,
    panelTop,
    windowHalf,
    railInner,
    panelOuter,
    topPanelW,
    topPanelD,
    topNotch,
    postCornerSolid,
    attachOffset,
    attachHoleD,
    postHoleDepth,
  };
}

/** The four side faces (lid handled separately). */
export const SIDE_FACES: PanelSlot[] = ['front', 'back', 'right', 'left'];

/** Outward normal axis for each face. */
export function faceNormal(slot: PanelSlot): [number, number, number] {
  switch (slot) {
    case 'front': return [0, -1, 0];
    case 'back':  return [0, 1, 0];
    case 'right': return [1, 0, 0];
    case 'left':  return [-1, 0, 0];
    case 'top':   return [0, 0, 1];
  }
}
