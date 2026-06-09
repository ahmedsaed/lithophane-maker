import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { HeightMap } from './types';
import { brightnessToThickness } from '../image/toHeightmap';

export interface PanelOptions {
  /** Footprint width (X) and height (Y) in mm. */
  width: number;
  height: number;
  /** Plate / tongue thickness in mm (the flat border height). */
  thickness: number;
  /** Flat border width that rides in the frame grooves (mm). */
  tongueWidth: number;
  lithoMin: number;
  lithoMax: number;
  heightMap: HeightMap;
  /** Grid cells along X and Y. */
  cellsX: number;
  cellsY: number;
  /** Mirror the image horizontally (needed when viewed through the flat side). */
  mirrorX?: boolean;
}

/** Bilinear brightness sample with u,v in [0,1] (v measured from image top). */
function sample(hm: HeightMap, u: number, v: number): number {
  const fx = u * (hm.width - 1);
  const fy = v * (hm.height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(hm.width - 1, x0 + 1);
  const y1 = Math.min(hm.height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const d = hm.data;
  const w = hm.width;
  const top = d[y0 * w + x0] * (1 - tx) + d[y0 * w + x1] * tx;
  const bot = d[y1 * w + x0] * (1 - tx) + d[y1 * w + x1] * tx;
  return top * (1 - ty) + bot * ty;
}

/**
 * Build a watertight lithophane panel: flat back at z=0, a relief front face
 * whose z varies with image brightness in the central region, and a flat
 * `thickness`-high tongue border. Outward normals; ready for STL export.
 *
 * The relief sits on +Z. Use placement/orientation to point it inward/outward.
 */
export function buildLithophanePanel(opts: PanelOptions): BufferGeometry {
  const {
    width: W,
    height: H,
    thickness,
    tongueWidth,
    lithoMin,
    lithoMax,
    heightMap,
    cellsX,
    cellsY,
    mirrorX = false,
  } = opts;

  const nx = Math.max(1, Math.floor(cellsX));
  const ny = Math.max(1, Math.floor(cellsY));
  const vpr = nx + 1; // verts per row

  const innerMinX = -W / 2 + tongueWidth;
  const innerMaxX = W / 2 - tongueWidth;
  const innerMinY = -H / 2 + tongueWidth;
  const innerMaxY = H / 2 - tongueWidth;
  const hasImage = innerMaxX > innerMinX && innerMaxY > innerMinY;

  const frontZ = (i: number, j: number): number => {
    const x = -W / 2 + (i / nx) * W;
    const y = -H / 2 + (j / ny) * H;
    if (
      hasImage &&
      x >= innerMinX &&
      x <= innerMaxX &&
      y >= innerMinY &&
      y <= innerMaxY
    ) {
      let u = (x - innerMinX) / (innerMaxX - innerMinX);
      if (mirrorX) u = 1 - u;
      const v = 1 - (y - innerMinY) / (innerMaxY - innerMinY); // image top = +Y
      const b = sample(heightMap, u, v);
      return Math.min(thickness, brightnessToThickness(b, lithoMin, lithoMax));
    }
    return thickness;
  };

  const positions: number[] = [];
  // Front grid vertices [0 .. nFront)
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + (i / nx) * W;
      const y = -H / 2 + (j / ny) * H;
      positions.push(x, y, frontZ(i, j));
    }
  }
  const nFront = (nx + 1) * (ny + 1);
  // Back grid vertices (flat z=0)
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + (i / nx) * W;
      const y = -H / 2 + (j / ny) * H;
      positions.push(x, y, 0);
    }
  }

  const ft = (i: number, j: number) => j * vpr + i;
  const bk = (i: number, j: number) => nFront + j * vpr + i;

  const indices: number[] = [];
  // Front faces (normal +Z)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = ft(i, j);
      const b = ft(i + 1, j);
      const c = ft(i + 1, j + 1);
      const d = ft(i, j + 1);
      indices.push(a, b, c, a, c, d);
    }
  }
  // Back faces (normal -Z, reversed winding)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = bk(i, j);
      const b = bk(i + 1, j);
      const c = bk(i + 1, j + 1);
      const d = bk(i, j + 1);
      indices.push(a, c, b, a, d, c);
    }
  }

  // Walls: CCW boundary loop, emit (Pf,Pb,Qb),(Pf,Qb,Qf) for outward normals.
  const loop: Array<[number, number]> = [];
  for (let i = 0; i <= nx; i++) loop.push([i, 0]); // bottom +X
  for (let j = 1; j <= ny; j++) loop.push([nx, j]); // right +Y
  for (let i = nx - 1; i >= 0; i--) loop.push([i, ny]); // top -X
  for (let j = ny - 1; j >= 1; j--) loop.push([0, j]); // left -Y
  for (let k = 0; k < loop.length; k++) {
    const [pi, pj] = loop[k];
    const [qi, qj] = loop[(k + 1) % loop.length];
    const pf = ft(pi, pj);
    const pb = bk(pi, pj);
    const qf = ft(qi, qj);
    const qb = bk(qi, qj);
    indices.push(pf, pb, qb, pf, qb, qf);
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/** Choose grid resolution for a panel from its image and a longest-side cap. */
export function panelCells(
  hm: HeightMap,
  longestSide: number,
): { cellsX: number; cellsY: number } {
  const maxDim = Math.max(hm.width, hm.height);
  const scale = Math.min(1, longestSide / maxDim);
  return {
    cellsX: Math.max(1, Math.round(hm.width * scale)),
    cellsY: Math.max(1, Math.round(hm.height * scale)),
  };
}
