import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  outputFileTracingIncludes: { "/api/run/[slug]": ["./demos/**/fixtures/**"] },
};

export default nextConfig;
