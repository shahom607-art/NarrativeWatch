const path = require("path");
const { config } = require("dotenv");

config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@narrativewatch/shared"],
};

module.exports = nextConfig;
