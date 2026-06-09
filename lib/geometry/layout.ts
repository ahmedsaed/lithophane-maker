import type { Params, PanelSlot } from './types';

/**
 * Derived dimensions shared by the frame, panels and base so every part fits.
 * Cube is centred at the origin, edges along X/Y/Z, spanning ±cubeSize/2.
 * Z is up. Side faces are ±X and ±Y; the top is +Z; the bottom (−Z) is open.
 */
export interface CubeLayout {
  C: number; // cube outer size
  half: number; // C/2
  p: number; // post cross-section
  t: number; // panel thickness
  clear: number; // groove clearance per side
  engage: number; // how deep a tongue sits inside a groove
  /** Distance of a side-panel mid-plane from the cube centre. */
  panelOffset: number;
  /** Side panel footprint (horizontal x vertical) in its own plane. */
  sidePanelW: number;
  sidePanelH: number;
  /** Top panel footprint (square). */
  topPanelW: number;
  /** Centre Z of a side panel. */
  sidePanelCenterZ: number;
  /** Z of the top panel mid-plane. */
  topPanelZ: number;
  /** Corner post centres in the XY plane. */
  postCenters: Array<[number, number]>;
}

export function cubeLayout(params: Params): CubeLayout {
  const C = params.cubeSize;
  const half = C / 2;
  const p = params.postSize;
  const t = params.panelThickness;
  const clear = params.grooveClearance;
  const engage = Math.min(params.tongueWidth, p * 0.7);

  const panelOffset = half - p / 2; // panel mid-plane centred in post depth
  const sidePanelW = C - 2 * p + 2 * engage; // spans opening + tongue both sides
  const sidePanelH = C - p - engage; // under top rail, above base
  const sidePanelCenterZ = (engage - p) / 2;
  const topPanelW = C - 2 * p + 2 * engage;
  const topPanelZ = half - p / 2;

  const c = half - p / 2;
  const postCenters: Array<[number, number]> = [
    [c, c],
    [c, -c],
    [-c, c],
    [-c, -c],
  ];

  return {
    C,
    half,
    p,
    t,
    clear,
    engage,
    panelOffset,
    sidePanelW,
    sidePanelH,
    topPanelW,
    sidePanelCenterZ,
    topPanelZ,
    postCenters,
  };
}

/** The four side faces (top handled separately). */
export const SIDE_FACES: PanelSlot[] = ['front', 'back', 'right', 'left'];

/** Outward normal axis for each side face. */
export function faceNormal(slot: PanelSlot): [number, number, number] {
  switch (slot) {
    case 'front':
      return [0, -1, 0];
    case 'back':
      return [0, 1, 0];
    case 'right':
      return [1, 0, 0];
    case 'left':
      return [-1, 0, 0];
    case 'top':
      return [0, 0, 1];
  }
}
