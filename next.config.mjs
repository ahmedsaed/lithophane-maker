/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static, client-side app — exportable to any static host (e.g. GitHub Pages).
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
