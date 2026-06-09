import { describe, it, expect } from 'vitest';
import { buildFrame } from './frame';
import { buildBasePlate } from './basePlate';
import { buildAllParts } from './assembly';
import { DEFAULT_PARAMS } from './constants';
import { geometryToStlBlob } from '../export/exportStl';
import type { HeightMap } from './types';

const hm: HeightMap = {
  width: 4,
  height: 4,
  data: Float32Array.from(Array.from({ length: 16 }, (_, i) => (i % 2 ? 1 : 0))),
};

function vertexCount(g: ReturnType<typeof buildFrame>) {
  return g.getAttribute('position').count;
}

describe('CSG parts build without throwing', () => {
  it('frame has geometry', () => {
    expect(vertexCount(buildFrame(DEFAULT_PARAMS))).toBeGreaterThan(0);
  });

  it('base has geometry', () => {
    expect(vertexCount(buildBasePlate(DEFAULT_PARAMS))).toBeGreaterThan(0);
  });

  it('buildAllParts returns frame, base and provided panels', () => {
    const parts = buildAllParts(
      { front: hm, top: hm },
      DEFAULT_PARAMS,
      80,
    );
    const ids = parts.map((p) => p.id).sort();
    expect(ids).toEqual(['base', 'frame', 'front', 'top']);
  });

  it('exports a non-empty STL blob', () => {
    const blob = geometryToStlBlob(buildFrame(DEFAULT_PARAMS));
    expect(blob.size).toBeGreaterThan(84); // STL header + at least one triangle
  });
});
