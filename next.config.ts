import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/admin/company-profile/:id",
        destination: "/admin/directory/company/:id?panel=record-actions",
        permanent: false,
      },
    ];
  },
  experimental:{serverActions:{bodySizeLimit:"6mb"}},
};

export default nextConfig;
