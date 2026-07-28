import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silences Turbopack's workspace-root inference: the repo root also has a
  // package-lock.json (the Expo app), which Turbopack would otherwise guess
  // as the root instead of this standalone Next.js project.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
