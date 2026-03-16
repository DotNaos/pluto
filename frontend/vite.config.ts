import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
const devProxyTarget = process.env.PLUTO_DEV_PROXY_TARGET ?? "http://127.0.0.1:4318";
const devHost = process.env.PLUTO_VITE_HOST ?? "127.0.0.1";
const devPort = Number(process.env.PLUTO_VITE_PORT ?? "4320");

export default defineConfig({
  root: frontendRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(frontendRoot, "src"),
    },
  },
  build: {
    outDir: path.resolve(frontendRoot, "../dist/web"),
    emptyOutDir: true,
  },
  server: {
    host: devHost,
    port: devPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/admin": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/healthz": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/favicon.ico": {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
