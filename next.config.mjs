import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve("."),
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
