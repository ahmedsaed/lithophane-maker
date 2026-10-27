import { describe, it, expect, beforeAll } from 'vitest';
import { buildFrame } from './frame';
import {
  BLANK_HEIGHTMAP, buildAllParts, buildPanelForPrint, buildSidePartLocal, buildTopPanelForPrint,
  fillBlankPanels, panelFileName,
} from './assembly';
import { brightnessToThickness } from '../image/toHeightmap';
import { cubeLayout } from './layout';
import { DEFAULT_PARAMS } from './constants';
import { geometryToStlBlob } from '../export/exportStl';
import { initManifold } from './manifoldInit';
import type { BufferGeometry } from 'three';
import type { HeightMap } from './types';

const hm: HeightMap = {
  width: 4,
  height: 4,
  data: Float32Array.from(Array.from({ length: 16 }, (_, i) => (i % 2 ? 1 : 0))),
};

function vertexCount(g: BufferGeometry) {
  return g.getAttribute('position').count;
}

describe('CSG / merged parts build without throwing', () => {
  beforeAll(async () => {
    await initManifold();
  });
  it('frame has geometry', () => {
    expect(vertexCount(buildFrame(DEFAULT_PARAMS))).toBeGreaterThan(0);
  });

  it('side part (plate + rail) merges', () => {
    expect(vertexCount(buildPanelForPrint('front', hm, DEFAULT_PARAMS, 60))).toBeGreaterThan(0);
  });

  it('buildAllParts returns frame, lid plus provided panels', () => {
    const parts = buildAllParts({ front: hm, back: hm }, DEFAULT_PARAMS, 60);
    const ids = parts.map((p) => p.id).sort();
    expect(ids).toEqual(['back', 'frame', 'front', 'lid']);
  });

  it('exports a non-empty STL blob', () => {
    const blob = geometryToStlBlob(buildFrame(DEFAULT_PARAMS));
    expect(blob.size).toBeGreaterThan(84);
  });
});

describe('blank panels', () => {
  beforeAll(async () => {
    await initManifold();
  });

  it('fill only the empty slots and are named as blank', () => {
    const { heightMaps, blankSlots } = fillBlankPanels({ front: hm, top: hm });
    expect(Object.keys(heightMaps).sort()).toEqual(['back', 'front', 'left', 'right', 'top']);
    expect(heightMaps.front).toBe(hm);
    expect(heightMaps.back).toBe(BLANK_HEIGHTMAP);
    expect(blankSlots.sort()).toEqual(['back', 'left', 'right']);
    expect(panelFileName('back', true)).toBe('side-back-blank.stl');
    expect(panelFileName('top', false)).toBe('top.stl');
  });

  it('are one even thickness at the mid-gray level across the image window', () => {
    const p = DEFAULT_PARAMS;
    const L = cubeLayout(p);
    const expected = brightnessToThickness(0.5, p.lithoMin, p.lithoMax, p.lithoGamma);
    const pos = buildSidePartLocal(BLANK_HEIGHTMAP, p, 60).getAttribute('position');
    // In local panel coordinates the flat back is at −t/2; the image window's
    // front face sits `expected` above it.
    const zs = new Set<string>();
    const winZ = -L.sidePanelCenterZ;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const inWindow = Math.abs(x) < L.windowHalf - 1 && Math.abs(y - winZ) < L.windowHalf - 1;
      if (inWindow && z > -L.t / 2 + 1e-3) zs.add((z + L.t / 2).toFixed(3));
    }
    expect([...zs]).toEqual([expected.toFixed(3)]);
  });

  it('give a complete cube when no images are uploaded', () => {
    const ids = buildAllParts(fillBlankPanels({}).heightMaps, DEFAULT_PARAMS, 40).map((x) => x.id).sort();
    expect(ids).toEqual(['back', 'frame', 'front', 'left', 'lid', 'right', 'top']);
  });
});

describe('print orientation', () => {
  // Image dark at the top (thick) and bright at the bottom (thin), so we can
  // tell which way up it was printed.
  // Square, because images are cropped to the square window.
  const topDark: HeightMap = { width: 2, height: 2, data: Float32Array.from([0, 0, 1, 1]) };

  for (const relief of ['outward', 'inward'] as const) {
    it(`${relief}-relief side panels stand on their bottom edge, image upright`, () => {
      const p = { ...DEFAULT_PARAMS, relief };
      const L = cubeLayout(p);
      const g = buildPanelForPrint('front', topDark, p, 40);
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.z).toBeCloseTo(0, 6);
      expect(b.max.z - b.min.z).toBeCloseTo(L.sidePanelH, 3); // standing: height is Z
      expect(b.max.y - b.min.y).toBeCloseTo(L.t, 3);          // thin along Y

      // Thickness (Y span) just inside the top vs bottom of the image window.
      const winMid = L.sidePanelH / 2 - L.sidePanelCenterZ; // window centre, height above the bed
      const span = (z0: number) => {
        const pos = g.getAttribute('position');
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < pos.count; i++) {
          if (Math.abs(pos.getZ(i) - z0) < 2 && Math.abs(pos.getX(i)) < L.windowHalf - 2) {
            lo = Math.min(lo, pos.getY(i));
            hi = Math.max(hi, pos.getY(i));
          }
        }
        return hi - lo;
      };
      expect(span(winMid + L.windowHalf - 3)).toBeGreaterThan(span(winMid - L.windowHalf + 3) + 0.5);
    });
  }

  it('the top panel stands on an edge', () => {
    const L = cubeLayout(DEFAULT_PARAMS);
    const g = buildTopPanelForPrint(hm, DEFAULT_PARAMS, 40);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.min.z).toBeCloseTo(0, 6);
    expect(b.max.z - b.min.z).toBeCloseTo(L.topPanelD, 3);
    expect(b.max.y - b.min.y).toBeCloseTo(L.t, 3);
  });
});
