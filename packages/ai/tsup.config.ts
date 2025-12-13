import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false, // Skip dts for now while Mastra API is in beta
  splitting: false,
  sourcemap: true,
  clean: true,
  skipNodeModulesBundle: true,
});
