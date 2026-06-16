import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this app so it stops guessing between
  // the stray C:\Users\Admin lockfile and the monorepo lockfile.
  turbopack: {
    // monorepo root (two levels up from apps/web) so workspace packages resolve
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
