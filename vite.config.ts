import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.url, "../client/src"),
      "@shared": path.resolve(import.meta.url, "../shared"),
      "@assets": path.resolve(import.meta.url, "../attached_assets"),
    },
  },
  root: path.resolve("./client"),
  build: {
    outDir: path.resolve("./client/dist"), // flattened build for Vercel
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    fs: {
      strict: true,
      allow: [path.resolve("./lib")],
      deny: ["**/.*"],
    },
    allowedHosts: true,
  },
});
