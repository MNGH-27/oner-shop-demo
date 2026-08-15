import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // بک‌اند تصاویر فروشگاه در شبکه محلی و روی پورت ۵۰۰۰ سرو می‌شود.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "5000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "localhost", port: "5000", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
