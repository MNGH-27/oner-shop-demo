import type { NextConfig } from "next";
import path from "node:path";

const mediaOrigin = new URL(
  process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://127.0.0.1:5000",
);
const localMediaHost = ["localhost", "127.0.0.1", "::1"].includes(
  mediaOrigin.hostname,
);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  images: {
    dangerouslyAllowLocalIP: localMediaHost,
    remotePatterns: [
      {
        protocol: mediaOrigin.protocol.replace(":", "") as "http" | "https",
        hostname: mediaOrigin.hostname,
        port: mediaOrigin.port,
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
