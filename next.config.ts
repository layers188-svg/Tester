import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Belt-and-braces for the spoiler rule: no page or API response may be
  // cached by an intermediary, since a cached response is one more place
  // a sealed title could survive (brief §11). Signed-in pages are
  // already force-dynamic; this covers the edge in front of them.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/:path(tonight|circle|library|you|desk)/:rest*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
