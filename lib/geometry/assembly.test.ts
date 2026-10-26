import { describe, it, expect, beforeAll } from 'vitest';
import { buildFrame } from './frame';
import { BLANK_HEIGHTMAP, buildAllParts, buildPanelFlat, fillBlankPanels, panelFileName } from './assembly';
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
    expect(vertexCount(buildPanelFlat('front', hm, DEFAULT_PARAMS, 60))).toBeGreaterThan(0);
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
    const pos = buildPanelFlat('front', BLANK_HEIGHTMAP, p, 60).getAttribute('position');
    // Flat back at −t/2; the image window's front face sits `expected` above it.
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
  // The flat back is one plane at the full plate thickness; the relief is the
  // rest. Printing flat-side down means that plane must be the panel's bottom.
  for (const relief of ['outward', 'inward'] as const) {
    it(`${relief} relief exports with the flat back down`, () => {
      const g = buildPanelFlat('front', hm, { ...DEFAULT_PARAMS, relief }, 40);
      g.computeBoundingBox();
      const minZ = g.boundingBox!.min.z;
      const pos = g.getAttribute('position');
      let atMin = 0;
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getZ(i) - minZ) < 1e-4) atMin++;
      // The whole back grid sits on the bed: half of all vertices.
      expect(atMin).toBe(pos.count / 2);
    });
  }
});

