import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@org/core", "@org/ui"],
  outputFileTracingExcludes: { "/*": ["../../.local-data/**/*"] },
};
export default config;
