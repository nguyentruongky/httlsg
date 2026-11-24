import type { NextConfig } from "next";
const config: NextConfig = {
  // Explicit local hosts only; production keeps its normal same-origin policy.
  ...(process.env.NODE_ENV === "development"
    ? {
        allowedDevOrigins: [
          "localhost",
          "127.0.0.1",
          ...(process.env.APP_ORIGIN
            ? [new URL(process.env.APP_ORIGIN).hostname]
            : []),
        ],
      }
    : {}),
  async headers() {
    return [
      {
        source: "/pwa/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Service-Worker-Allowed", value: "/client" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/client/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
  transpilePackages: ["@org/core", "@org/ui"],
  // PDFKit/fontkit read bundled font data through native Node file URLs.
  // Keep them outside webpack so those URLs retain their filesystem meaning.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/*": ["./assets/NotoSans-Regular.ttf"],
  },
  outputFileTracingExcludes: { "/*": ["../../.local-data/**/*"] },
};
export default config;
