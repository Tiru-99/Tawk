import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode : false,
  images: {
    domains: ['tiru-chatapp.s3.ap-south-1.amazonaws.com'],
  },
};

export default nextConfig;
