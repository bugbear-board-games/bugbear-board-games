import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Room for event image uploads (capped at 4 MB in src/lib/images.ts) plus the form fields.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
