import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  webpack(config) {
    // manifold-3d/manifold.js contains `await import("node:module")` guarded by
    // `if(ENVIRONMENT_IS_NODE)`. Webpack's static analyser raises an
    // UnhandledSchemeError for the "node:" URI scheme before the guard runs.
    // This loader replaces those dead-code calls with Promise.resolve({})
    // so the browser build succeeds without changing observable behaviour.
    // enforce:'pre' guarantees this runs before webpack's own module parsing.
    config.module.rules.unshift({
      test: /node_modules[\\/]manifold-3d[\\/]manifold\.js$/,
      enforce: 'pre',
      use: path.resolve(__dirname, 'lib/webpack/strip-node-imports.cjs'),
    });

    // manifold-3d/manifold.js dynamically loads its WASM via fetch (locateFile).
    // Webpack 5 requires asyncWebAssembly to handle .wasm files it encounters
    // while tracing the module graph (e.g. from require.resolve in manifoldInit).
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    return config;
  },
};

export default nextConfig;
