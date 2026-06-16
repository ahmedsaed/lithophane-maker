import type { Params, PanelSlot } from './types';

/**
 * Derived dimensions shared by the frame and side panels so every part fits.
 * Cube is centred at the origin, edges along X/Y/Z, spanning ±cubeSize/2.
 * Z is up. Side faces are ±X and ±Y; the bottom (−Z) is a solid floor printed
 * with the frame (light is inserted through a side opening).
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
  /** Lid frame total height (Z). */
  lidThickness: number;
  /** Centre Z of the lid frame body = centre of the top-panel groove slot. */
  lidCenterZ: number;
  /** Top panel footprint: width (X) and depth (Y, slide direction). */
  topPanelW: number;
  topPanelD: number;
}

export function cubeLayout(params: Params): CubeLayout {
  const C = params.cubeSize;
  const half = C / 2;
  const p = params.postSize;
  const t = params.panelThickness;
  const clear = params.grooveClearance;
  const engage = Math.min(params.tongueWidth, p * 0.7);

  const cornerReach = Math.min(p * 1.8, C * 0.35);

  const panelOffset = half - p / 2; // recessed inside the posts
  const sidePanelW = C - 2 * cornerReach + 2 * engage;
  // Panels fill from floor top (−half+bottomThickness) to post top (+half).
  const sidePanelH = C - params.bottomThickness;
  const sidePanelCenterZ = params.bottomThickness / 2;
  const grooveCenter = half - cornerReach + (engage + clear) / 2;

  const railW = C - 2 * cornerReach; // post-inner-face to post-inner-face

  // Lid geometry — shared with lidFrame.ts and assembly.ts.
  const slotW = t + 2 * clear;
  const minWall = Math.max(1.5, t * 0.5);
  const lidThickness = slotW + 2 * minWall;
  const lidCenterZ = half + lidThickness / 2;

  // Top panel: same X groove geometry as sides, symmetric in Y so the panel
  // centres at Y=0. The back tongue (engage wide) sits in the back-rail groove.
  const topPanelW = C - 2 * cornerReach + 2 * engage; // = sidePanelW
  const topPanelD = 2 * (C / 2 - cornerReach + engage); // = topPanelW = sidePanelW

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
    lidCenterZ,
    topPanelW,
    topPanelD,
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
