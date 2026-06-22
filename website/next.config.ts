import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
