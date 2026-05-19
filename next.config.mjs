/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/ai/*": ["./public/data/*"],
    },
  },
};

export default nextConfig;
