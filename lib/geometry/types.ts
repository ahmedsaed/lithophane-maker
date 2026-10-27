import type { BufferGeometry } from 'three';

/** Which of the cube's openings an image belongs to. */
export type PanelSlot = 'front' | 'back' | 'left' | 'right' | 'top';

export const PANEL_SLOTS: PanelSlot[] = ['front', 'back', 'left', 'right', 'top'];

/** The seven printable parts of the assembled cube. */
export type PartId = PanelSlot | 'frame' | 'lid';

/** A grayscale height field sampled on a regular grid. */
export interface HeightMap {
  width: number; // number of samples along X
  height: number; // number of samples along Y
  /** Normalized brightness in [0,1], row-major, length = width*height. */
  data: Float32Array;
}

/** Direction the lithophane relief points relative to the panel plane. */
export type ReliefDirection = 'inward' | 'outward';

/** How the lid holds onto the corner posts. */
export type LidAttach = 'pressfit' | 'magnet';

/** Grayscale conversion mode for image-to-heightmap conversion. */
export type GrayscaleMode = 'rec601' | 'rec709' | 'average' | 'luminosity';

/** All parametric inputs, in millimetres unless noted. */
export interface Params {
  /** Outer edge length of the cube. */
  cubeSize: number;
  /**
   * Width of the frame band visible around every panel window (mm). The posts,
   * the bottom rail and the lid are all this wide; post internals derive from it.
   */
  frameWidth: number;
  /** Minimum (brightest) lithophane thickness. */
  lithoMin: number;
  /** Maximum (darkest) lithophane thickness; also the panel's thickness, border included. */
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
  /** Lid attachment: printed pegs pressed into the posts, or glued-in magnets. */
  lidAttach: LidAttach;
  /** Press-fit peg length below the lid (mm). Longer pegs grip harder. */
  pegDepth: number;
  /** Per-side gap between a peg and its hole (mm). 0 = interference-free exact fit. */
  pegClearance: number;
  /** Disc magnet diameter (mm). */
  magnetDiameter: number;
  /** Disc magnet height (mm). */
  magnetHeight: number;
  /** Exported detail: mm of panel per image sample. Exports honour it up to MAX_PANEL_CELLS. */
  mmPerPixel: number;
  /** Cable/USB holes in the solid bottom. */
  cableHoles: CableHole[];

  // --- Lithophane image-quality controls ---

  /** Brightness offset applied to luma before thickness mapping [-0.5, 0.5]. */
  lithoBrightness: number;
  /** Contrast multiplier applied to luma before thickness mapping [0.5, 2.0]. */
  lithoContrast: number;
  /** Stretch the brightness histogram to fill [0, 1] before other adjustments. */
  lithoAutoContrast: boolean;
  /**
   * Gamma exponent applied to brightness before the linear thickness mapping.
   * Compensates for light fading exponentially through the plastic
   * (Beer–Lambert), which depends on the filament's translucency.
   * 0.45 ≈ inverse of sRGB gamma; 1.0 = linear.
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
