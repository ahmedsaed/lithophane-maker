import type { BufferGeometry } from 'three';

/** Which of the cube's openings an image belongs to. */
export type PanelSlot = 'front' | 'back' | 'left' | 'right' | 'top';

export const PANEL_SLOTS: PanelSlot[] = ['front', 'back', 'left', 'right', 'top'];

/** The six printable parts of the assembled cube (frame + 4 sides + lid). */
export type PartId = PanelSlot | 'frame';

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
  /** Nominal corner-post size; also drives the corner reach/ramp. */
  postSize: number;
  /** Total plate / tongue thickness of a side panel. */
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
  /** Thickness of the solid frame bottom. */
  bottomThickness: number;
  /** Thickness of the top lid panel (also the height of the frame top ring). */
  lidThickness: number;
  /** Chamfer size on the outer arm-tip edges of each corner post (mm). */
  grooveChamfer: number;
  /** Cable/USB holes in the solid bottom. */
  cableHoles: CableHole[];
}

export interface CableHole {
  /** Hole diameter (mm). */
  diameter: number;
  /** Offset from bottom centre along X (mm). */
  x: number;
  /** Offset from bottom centre along Y (mm). */
  y: number;
}

/** A generated, named part ready for preview or export. */
export interface PartMesh {
  id: PartId;
  geometry: BufferGeometry;
}
