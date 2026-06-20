import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@e-logistic/api",
    "@e-logistic/core",
    "@e-logistic/ui",
    "@e-logistic/i18n",
    "@e-logistic/maps",
  ],
};

export default config;
