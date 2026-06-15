import { BufferAttribute, BufferGeometry } from 'three';
import type { Manifold } from 'manifold-3d';
import type { Mat4 } from 'manifold-3d';
import { getManifold } from './manifoldInit';

export type { Manifold };

/** Convert a manifold result to a Three.js BufferGeometry. */
export function manifoldToGeometry(m: Manifold): BufferGeometry {
  const mesh = m.getMesh();
  const { numProp, vertProperties, triVerts } = mesh;

  const numVerts = vertProperties.length / numProp;
  const positions = new Float32Array(numVerts * 3);
  for (let i = 0; i < numVerts; i++) {
    positions[i * 3]     = vertProperties[i * numProp];
    positions[i * 3 + 1] = vertProperties[i * numProp + 1];
    positions[i * 3 + 2] = vertProperties[i * numProp + 2];
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(positions, 3));
  geom.setIndex(new BufferAttribute(triVerts, 1));
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/** Axis-aligned box of size (sx,sy,sz) centred at the origin, then translated. */
export function mBox(
  sx: number,
  sy: number,
  sz: number,
  cx = 0,
  cy = 0,
  cz = 0,
): Manifold {
  const { Manifold } = getManifold();
  return Manifold.cube([sx, sy, sz], true).translate(cx, cy, cz);
}

/**
 * Box rotated around Z by `angleDeg` degrees, centred at the origin then
 * translated — equivalent to the old three-bvh-csg `rotBox`.
 */
export function mRotBox(
  sx: number,
  sy: number,
  sz: number,
  angleDeg: number,
  cx = 0,
  cy = 0,
  cz = 0,
): Manifold {
  const { Manifold } = getManifold();
  return Manifold.cube([sx, sy, sz], true)
    .rotate([0, 0, angleDeg])
    .translate(cx, cy, cz);
}

/** Z-aligned cylinder centred at the origin then translated. */
export function mCylinderZ(
  radius: number,
  height: number,
  cx = 0,
  cy = 0,
  cz = 0,
  segments = 32,
): Manifold {
  const { Manifold } = getManifold();
  return Manifold.cylinder(height, radius, radius, segments, true).translate(cx, cy, cz);
}

/**
 * Extrude a closed 2-D polygon along +Z by `depth`, centred on Z, then apply
 * an optional 4×4 column-major affine transform.
 */
export function mExtrudePrism(
  points: Array<[number, number]>,
  depth: number,
  mat4?: Mat4,
): Manifold {
  const { Manifold, CrossSection } = getManifold();
  const cs = new CrossSection([points]);
  let solid = Manifold.extrude(cs, depth, 0, 0, [1, 1], true);
  if (mat4) solid = solid.transform(mat4);
  return solid;
}

export function mUnion(a: Manifold, b: Manifold): Manifold {
  return a.add(b);
}

export function mSubtract(a: Manifold, b: Manifold): Manifold {
  return a.subtract(b);
}

export function mUnionAll(ms: Manifold[]): Manifold {
  const { Manifold } = getManifold();
  return Manifold.union(ms);
}
