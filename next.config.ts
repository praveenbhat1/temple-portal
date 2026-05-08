import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Firebase Storage images
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      {
        // Google user profile images (if needed)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Cloudinary images
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // Google Static Assets (Auth Icons)
        protocol: "https",
        hostname: "www.gstatic.com",
      },
    ],
    localPatterns: [
      {
        pathname: "/**",
        search: "?*",
      },
    ],
  },
};

export default nextConfig;
