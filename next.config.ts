import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.sharepoint.com https://outlook.office.com https://*.office.com https://*.microsoft.com https://*.microsoftonline.com https://*.cloud.microsoft https://*.teams.live.com",
          },
          {
            key: 'X-Frame-Options',
            value: '', // Use CSP frame-ancestors instead; setting this to empty may help remove default SAMEORIGIN
          },
        ],
      },
    ];
  },
};

export default nextConfig;
