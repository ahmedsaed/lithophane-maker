import { BufferAttribute, BufferGeometry } from 'three';
import type { Manifold } from 'manifold-3d';
import type { Mat4 } from 'manifold-3d';
import { getManifold } from './manifoldInit';

export type { Manifold };

// Manifold objects live in WASM memory and are never garbage-collected. Every
// manifold created by these helpers is recorded in the active scope and freed
// when the scope ends, so rebuilding parts on each parameter change doesn't
// leak until the 4 GB WASM heap is exhausted.
let scope: Manifold[] | null = null;

function track(m: Manifold): Manifold {
  scope?.push(m);
  return m;
}

/**
 * Run `fn` and free every manifold the helpers created during it. Results must
 * be converted (e.g. with manifoldToGeometry) before the scope ends.
 */
export function withManifoldScope<T>(fn: () => T): T {
  const outer = scope;
  const mine: Manifold[] = [];
  scope = mine;
  try {
    return fn();
  } finally {
    scope = outer;
    for (const m of mine) m.delete();
  }
}

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
  geom.computeBoundingBox();
  return geom;
}

/** Convert an indexed Three.js geometry (e.g. a lithophane panel) to a manifold. */
export function geometryToManifold(g: BufferGeometry): Manifold {
  const { Manifold, Mesh } = getManifold();
  const index = g.getIndex();
  if (!index) throw new Error('geometryToManifold requires an indexed geometry');
  const mesh = new Mesh({
    numProp: 3,
    vertProperties: Float32Array.from(g.getAttribute('position').array as ArrayLike<number>),
    triVerts: Uint32Array.from(index.array as ArrayLike<number>),
  });
  mesh.merge();
  return track(new Manifold(mesh));
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
  return track(track(Manifold.cube([sx, sy, sz], true)).translate(cx, cy, cz));
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
  const rotated = track(track(Manifold.cube([sx, sy, sz], true)).rotate([0, 0, angleDeg]));
  return track(rotated.translate(cx, cy, cz));
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
  return track(track(Manifold.cylinder(height, radius, radius, segments, true)).translate(cx, cy, cz));
}

/** Z-aligned truncated cone (radius rBottom at −height/2, rTop at +height/2), centred then translated. */
export function mFrustumZ(
  rBottom: number,
  rTop: number,
  height: number,
  cx = 0,
  cy = 0,
  cz = 0,
  segments = 32,
): Manifold {
  const { Manifold } = getManifold();
  return track(track(Manifold.cylinder(height, rBottom, rTop, segments, true)).translate(cx, cy, cz));
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
  let solid = track(Manifold.extrude(cs, depth, 0, 0, [1, 1], true));
  cs.delete();
  if (mat4) solid = track(solid.transform(mat4));
  return solid;
}

export function mUnion(a: Manifold, b: Manifold): Manifold {
  return track(a.add(b));
}

export function mSubtract(a: Manifold, b: Manifold): Manifold {
  return track(a.subtract(b));
}

export function mIntersect(a: Manifold, b: Manifold): Manifold {
  return track(a.intersect(b));
}

export function mTranslate(a: Manifold, x: number, y: number, z: number): Manifold {
  return track(a.translate(x, y, z));
}

export function mUnionAll(ms: Manifold[]): Manifold {
  const { Manifold } = getManifold();
  return track(Manifold.union(ms));
}
