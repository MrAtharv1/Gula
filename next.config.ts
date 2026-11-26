import type { NextConfig } from "next";

const isCapacitorExport = process.env.CAPACITOR_EXPORT === "1";

const nextConfig: NextConfig = isCapacitorExport
  ? {
      output: "export",
      images: {
        unoptimized: true,
      },
      turbopack: {
        rules: {
          "*.css": {
            loaders: ["@tailwindcss/turbopack"],
            as: "*.css",
          },
        },
      },
    }
  : {
      cacheComponents: true,
      partialPrefetching: true,
      turbopack: {
        rules: {
          "*.css": {
            loaders: ["@tailwindcss/turbopack"],
            as: "*.css",
          },
        },
      },
    };

export default nextConfig;
