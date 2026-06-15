import { describe, it, expect, beforeAll } from 'vitest';
import { buildFrame } from './frame';
import { buildAllParts, buildPanelFlat } from './assembly';
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

  it('lid builds', () => {
    expect(vertexCount(buildPanelFlat('top', hm, DEFAULT_PARAMS, 60))).toBeGreaterThan(0);
  });

  it('buildAllParts returns frame plus provided panels (no base)', () => {
    const parts = buildAllParts({ front: hm, top: hm }, DEFAULT_PARAMS, 60);
    const ids = parts.map((p) => p.id).sort();
    expect(ids).toEqual(['frame', 'front', 'top']);
  });

  it('exports a non-empty STL blob', () => {
    const blob = geometryToStlBlob(buildFrame(DEFAULT_PARAMS));
    expect(blob.size).toBeGreaterThan(84);
  });
});
