import type { BufferGeometry } from 'three';

/** Which of the cube's openings an image belongs to. */
export type PanelSlot = 'front' | 'back' | 'left' | 'right' | 'top';

export const PANEL_SLOTS: PanelSlot[] = ['front', 'back', 'left', 'right', 'top'];

/** The seven printable parts of the assembled cube. */
export type PartId = PanelSlot | 'frame' | 'base';

/** A grayscale height field sampled on a regular grid. */
export interface HeightMap {
  width: number; // number of samples along X
  height: number; // number of samples along Y
  /** Normalized brightness in [0,1], row-major, length = width*height. */
  data: Float32Array;
}

/** Direction the lithophane relief points relative to the panel plane. */
export type ReliefDirection = 'inward' | 'outward';

/** All parametric inputs, in millimetres unless noted. */
export interface Params {
  /** Outer edge length of the cube. */
  cubeSize: number;
  /** Square cross-section of the frame corner posts. */
  postSize: number;
  /** Total plate / tongue thickness of a panel. */
  panelThickness: number;
  /** Minimum (brightest) lithophane thickness. */
  lithoMin: number;
  /** Maximum (darkest) lithophane thickness. */
  lithoMax: number;
  /** Per-side slide clearance between tongue and groove. */
  grooveClearance: number;
  /** Width of the flat border that rides in the groove. */
  tongueWidth: number;
  /** Invert brightness->thickness mapping. */
  invert: boolean;
  /** Relief direction. */
  relief: ReliefDirection;
  /** Longest-side sample count for preview meshes. */
  previewResolution: number;
  /** Longest-side sample count for exported meshes. */
  exportResolution: number;
  /** Cable/USB holes in the base plate. */
  cableHoles: CableHole[];
}

export interface CableHole {
  /** Hole diameter (mm). */
  diameter: number;
  /** Offset from base centre along X (mm). */
  x: number;
  /** Offset from base centre along Y (mm). */
  y: number;
}

/** A generated, named part ready for preview or export. */
export interface PartMesh {
  id: PartId;
  geometry: BufferGeometry;
}
