import type { BufferGeometry } from 'three';

/** Which of the cube's openings an image belongs to. */
export type PanelSlot = 'front' | 'back' | 'left' | 'right' | 'top';

export const PANEL_SLOTS: PanelSlot[] = ['front', 'back', 'left', 'right', 'top'];

/** The seven printable parts of the assembled cube. */
export type PartId = PanelSlot | 'frame' | 'lid' | 'plug';

/** A grayscale height field sampled on a regular grid. */
export interface HeightMap {
  width: number; // number of samples along X
  height: number; // number of samples along Y
  /** Normalized brightness in [0,1], row-major, length = width*height. */
  data: Float32Array;
}

/** Direction the lithophane relief points relative to the panel plane. */
export type ReliefDirection = 'inward' | 'outward';

/** Grayscale conversion mode for image-to-heightmap conversion. */
export type GrayscaleMode = 'rec601' | 'rec709' | 'average' | 'luminosity';

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
  /** Enable chamfers on outer arm-tip edges and base ramp wedges. */
  chamfer: boolean;
  /** Physical resolution: how many mm each source image pixel maps to on the panel. */
  mmPerPixel: number;
  /** Cable/USB holes in the solid bottom. */
  cableHoles: CableHole[];

  // --- Lithophane image-quality controls ---

  /** Grayscale conversion method. */
  grayscaleMode: GrayscaleMode;
  /** Brightness offset applied to luma before thickness mapping [-0.5, 0.5]. */
  lithoBrightness: number;
  /** Contrast multiplier applied to luma before thickness mapping [0.5, 2.0]. */
  lithoContrast: number;
  /** Stretch the brightness histogram to fill [0, 1] before other adjustments. */
  lithoAutoContrast: boolean;
  /**
   * Gamma exponent applied to brightness before the linear thickness mapping.
   * Compensates for Beer-Lambert non-linearity of light through PLA.
   * 0.45 ≈ inverse of sRGB gamma; 1.0 = linear (previous behaviour).
   */
  lithoGamma: number;
  /** Unsharp mask amount [0, 2]. 0 = off. */
  lithoSharpen: number;
}

/** A normalized crop rectangle in image space, each value in [0, 1]. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
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
