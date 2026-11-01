/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export per ARCHITECTURE.md section 8: no Node server or API routes.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
