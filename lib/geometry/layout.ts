import type { Params, PanelSlot } from './types';

/**
 * Derived dimensions shared by the frame and side panels so every part fits.
 * Cube is centred at the origin, edges along X/Y/Z, spanning ±cubeSize/2.
 * Z is up. Side faces are ±X and ±Y; the bottom (−Z) is a solid floor printed
 * with the frame. Every face is framed by a band `cornerReach` wide: the posts
 * at the sides, a rail along the floor at the bottom and the lid at the top,
 * so each panel shows a square image window. The lid is the top `cornerReach`
 * of the frame; the posts stop there, apart from a small support at each inner
 * corner that the top panel rests on.
 *
 * All five panels are the same square: the window plus an `engage`-wide border
 * on every edge, which rides in a groove on all four sides.
 */
export interface CubeLayout {
  C: number; // cube outer size
  half: number; // C/2
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
  /** Z of the top panel's underside: the top of the corner supports and of the lid's skirts. */
  topPanelBase: number;
  /** Half-size of every panel: the window plus its `engage` border. Side panels span ±panelEdge in Z. */
  panelEdge: number;
  /** Half-size of the square image window on every face (= post inner face). */
  windowHalf: number;
  /** Inner face of the bottom rails and lid skirts that form the bottom/top grooves. */
  railInner: number;
  /** Outer face of the side panels. */
  panelOuter: number;
  /** Top panel footprint — the same square as the side panels. */
  topPanelW: number;
  topPanelD: number;
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
/**
 * Wall in front of every panel groove (mm), between the panel and the cube's
 * outer face — about 5–6 lines at 0.4 mm. Independent of frame width and panel
 * thickness; at the defaults it matches the geometry the test prints used.
 */
export const OUTER_WALL = 2.4;
/**
 * Most samples across one exported panel. Keeps a panel's mesh small enough to
 * build and download in a browser; validateParams warns when it limits detail.
 */
export const MAX_PANEL_CELLS = 1000;
/** Thickness of the frame's solid floor (mm). Hidden inside the cube. */
export const FLOOR_THICKNESS = 3;
/** Wall on the inner side of the top and bottom panel grooves (mm). */
export const RAIL_INNER_WALL = 2;
/** Extra diameter and depth given to magnet holes so magnets press or glue in (mm). */
export const MAGNET_FIT = 0.2;
/** Extra post-hole depth below a peg tip so the peg bottoms out on the lid, not the hole (mm). */
export const PEG_HOLE_EXTRA = 0.5;

/** Wall left around a press-fit peg hole in the post (mm). */
export const MIN_ATTACH_WALL = 1.2;

/** Peg hole diameter (mm): the size the press-fit test prints validated. Pegs are this minus 2 × pegClearance. */
export const PEG_HOLE_D = 6.8;

/** Diameter of the peg or magnet hole in each post top and lid corner. */
export function attachHoleDiameter(params: Params): number {
  return params.lidAttach === 'magnet' ? params.magnetDiameter + MAGNET_FIT : PEG_HOLE_D;
}

/**
 * The frame width: the narrowest post that holds everything it has to, which
 * is also the visible band around every window (posts, bottom rail, lid).
 *
 * Along the face: the panel's border in its groove, the clearance, and the peg
 * or magnet hole with a wall either side. Into the cube, from the face: the
 * outer wall, the panel in its slot, the groove's inner wall, then `clear`
 * and the top panel's border resting on the corner support. And a magnet's
 * hole must fit the lid's corner block, which is as tall as the frame is wide.
 * Wider is only a
 * style choice, and narrower would mean shallower grooves or smaller pegs, so
 * it is not a setting.
 */
export function frameWidth(params: Params): number {
  const clear = params.grooveClearance;
  const border = params.tongueWidth;
  const along = border + clear + attachHoleDiameter(params) + 2 * MIN_ATTACH_WALL;
  const into = OUTER_WALL + (clear + params.lithoMax + clear) + RAIL_INNER_WALL + clear + border;
  // The lid's corner block is as tall as the frame is wide; a magnet needs its
  // hole there plus a wall above it.
  const magnetDepth = params.lidAttach === 'magnet' ? params.magnetHeight + MAGNET_FIT + MIN_ATTACH_WALL : 0;
  return Math.max(along, into, magnetDepth);
}

export function cubeLayout(params: Params): CubeLayout {
  const C = params.cubeSize;
  const half = C / 2;
  // A panel is as thick as its darkest point; its flat border is the same.
  const t = params.lithoMax;
  const clear = params.grooveClearance;
  // How far a panel's border reaches into its groove (= the border's width).
  const engage = params.tongueWidth;
  // The frame width — the visible band around each window — is sized to fit
  // what the posts hold, not chosen: see frameWidth().
  const cornerReach = frameWidth(params);

  // Every panel's outer face sits OUTER_WALL + clear behind its cube face,
  // whatever the frame width or panel thickness, so the wall in front of each
  // groove is always OUTER_WALL thick and all five faces look the same.
  const panelOuter = half - OUTER_WALL - clear;
  // The top panel is recessed just as far below the top face.
  const lidLip = half - panelOuter - LID_RECESS_GAP;
  const lidRecess = t + LID_RECESS_GAP;
  const lidRing = lidLip + lidRecess;
  const lidThickness = cornerReach;
  const postTop = half - lidThickness;
  const topPanelBase = half - lidRing;
  const windowHalf = half - cornerReach;
  const panelEdge = windowHalf + engage;

  const panelOffset = panelOuter - t / 2; // panel mid-plane, behind the outer wall
  // Square, centred on the window: the bottom border sits in the frame's bottom
  // groove and the top border in the lid's, `engage` deep like the side grooves.
  const sidePanelW = 2 * panelEdge;
  const sidePanelH = sidePanelW;
  const sidePanelCenterZ = 0;
  // The inner groove wall is RAIL_INNER_WALL thick where there is room, but
  // always stays `clear` outside the top panel's edge: the lid's skirts carry
  // this wall down past the top panel as the lid is lowered.
  const railInner = Math.max(panelOffset - t / 2 - clear - RAIL_INNER_WALL, panelEdge + clear);
  const grooveCenter = half - cornerReach + (engage + clear) / 2;

  const railW = C - 2 * cornerReach; // post-inner-face to post-inner-face

  // The top panel is the same square as the sides. Its corners rest on the
  // posts' corner supports, and the lid traps it from above.
  const topPanelW = sidePanelW;
  const topPanelD = sidePanelW;

  // Pegs / magnets sit in the solid square at each post's outer corner, which
  // starts where the grooves end.
  const postCornerSolid = cornerReach - engage - clear;
  const attachOffset = half - postCornerSolid / 2;
  const attachHoleD = attachHoleDiameter(params);
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
    t,
    clear,
    engage,
    cornerReach,
    bottomThickness: FLOOR_THICKNESS,
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
    topPanelBase,
    panelEdge,
    windowHalf,
    railInner,
    panelOuter,
    topPanelW,
    topPanelD,
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
