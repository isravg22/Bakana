import path from "node:path";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = "Bakana";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGithubPages ? "export" : undefined,
  pageExtensions: isGithubPages ? ["tsx", "jsx"] : ["tsx", "ts", "jsx", "js"],
  outputFileTracingRoot: path.resolve("."),
  basePath: isGithubPages ? `/${repoName}` : undefined,
  assetPrefix: isGithubPages ? `/${repoName}/` : undefined,
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
