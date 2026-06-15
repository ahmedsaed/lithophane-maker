import ManifoldModule from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';

let _mf: ManifoldToplevel | null = null;
let _initPromise: Promise<void> | null = null;

function wasmLocator(): string {
  // In the browser the WASM is served from /public; in Node.js (vitest) we
  // resolve it from node_modules at runtime using process.cwd() so that
  // webpack never sees a static literal path to the .wasm file (which would
  // cause it to try to bundle the binary and fail).
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('path').join(process.cwd(), 'node_modules', 'manifold-3d', 'manifold.wasm');
  }
  return '/manifold.wasm';
}

export async function initManifold(): Promise<void> {
  if (_mf) return;
  if (_initPromise) return _initPromise;
  _initPromise = ManifoldModule({ locateFile: wasmLocator }).then((wasm) => {
    wasm.setup();
    _mf = wasm;
  });
  return _initPromise;
}

export function getManifold(): ManifoldToplevel {
  if (!_mf) throw new Error('Manifold not initialized — await initManifold() first');
  return _mf;
}

export function isManifoldReady(): boolean {
  return _mf !== null;
}
