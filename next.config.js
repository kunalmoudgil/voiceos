// Set this when deploying to a subpath, e.g. GitHub Pages project sites
// (username.github.io/repo-name instead of a custom domain / org root site):
//   NEXT_PUBLIC_BASE_PATH=/repo-name npm run build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: VoiceOS ships as plain HTML/CSS/JS with zero server
  // dependency, so it deploys identically on Vercel, GitHub Pages, Netlify,
  // or any static file host. All "backend" work (STT inference, storage,
  // routing) happens client-side in the browser.
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // @xenova/transformers tries to resolve a couple of Node-only optional
    // deps (sharp, onnxruntime-node) that don't exist / aren't needed in the
    // browser bundle. Aliasing them to `false` tells webpack to stub them out.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

module.exports = nextConfig;
