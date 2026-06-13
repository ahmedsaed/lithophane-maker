import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  Shape,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Extrude a closed 2D polygon (in the XY plane) by `depth` along +Z, centred
 * on Z, then optionally transform it.
 */
export function extrudePrism(
  points: Array<[number, number]>,
  depth: number,
  matrix?: Matrix4,
): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();

  const geom = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geom.translate(0, 0, -depth / 2);
  if (matrix) geom.applyMatrix4(matrix);
  return geom;
}

/** Strip a geometry down to a non-indexed position-only copy. */
function positionsOnly(g: BufferGeometry): BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const out = new BufferGeometry();
  out.setAttribute(
    'position',
    new Float32BufferAttribute(
      (src.getAttribute('position').array as Float32Array).slice(),
      3,
    ),
  );
  return out;
}

/**
 * Merge several geometries into one watertight-enough mesh for preview and STL
 * export. Attributes are normalised to position-only and normals recomputed,
 * so callers can freely mix indexed panels with extruded rails.
 */
export function mergeGeoms(list: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(list.map(positionsOnly), false);
  if (!merged) throw new Error('mergeGeometries failed');
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}
