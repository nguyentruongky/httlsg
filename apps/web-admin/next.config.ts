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
  transpilePackages: ["@org/core", "@org/ui"],
  outputFileTracingExcludes: { "/*": ["../../.local-data/**/*"] },
};
export default config;
