import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Local JSON mode still posts a clip through the server action (10 MB cap).
      // With Supabase configured, the browser uploads straight to Storage, so the
      // file never hits this limit or Vercel's ~4.5 MB platform body cap.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
