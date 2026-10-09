/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploads go through route handlers (streamed), but keep a generous limit
  // in case server actions are used later.
  experimental: {
    serverActions: { bodySizeLimit: "2048mb" },
  },
  // We serve original bytes ourselves; never let Next re-encode them.
  images: { unoptimized: true },
};

export default nextConfig;
