import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  images: {
    remotePatterns: [new URL('https://en.numista.com/catalogue/photos/**')],
  },
}
export default nextConfig;
