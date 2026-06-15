// Webpack loader: removes `import("node:*")` calls from manifold-3d/manifold.js.
// These calls are guarded by `if(ENVIRONMENT_IS_NODE)` so they never run in
// the browser, but webpack's static analyser can't handle the "node:" URI scheme.
// Replacing them with Promise.resolve({}) makes the build succeed without
// changing any observable browser behaviour.

/** @param {string} source */
module.exports = function stripNodeImports(source) {
  return source.replace(/await import\(["']node:[^"']+["']\)/g, 'await Promise.resolve({})');
};
