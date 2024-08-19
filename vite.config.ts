import { defineConfig } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";
import solidPlugin from 'vite-plugin-solid';

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "manifest.json"],
      webExtConfig: {
        startUrl: 'https://sentry.io',
      },
      additionalInputs: ["src/index.html", "src/index.tsx", "src/app.css", "src/content-script.ts", "src/web-accessible-script.ts"],
    }),
    solidPlugin(),
  ],
});
