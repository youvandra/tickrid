/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "framerusercontent.com",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: [
    "http://172.20.10.7",
    "http://172.20.10.7:3000"
  ]
};

module.exports = nextConfig;
