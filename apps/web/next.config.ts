import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@e-logistic/core", "@e-logistic/ui", "@e-logistic/i18n"],
};

export default config;
