import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Room for event image uploads (capped at 4 MB in src/lib/images.ts) plus the form fields.
    // Stays under Vercel's 4.5 MB limit on request bodies.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
