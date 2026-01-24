import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
    root: path.resolve(__dirname, "client"), // <-- Vite root points to client folder
    plugins: [
        react(),
        runtimeErrorOverlay(),
        ...(process.env.NODE_ENV !== "production" &&
            process.env.REPL_ID !== undefined
            ? [
                // For Replit only, leave async imports as-is
                await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
                await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
            ]
            : []),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "client/src"), // <-- @ points to src folder
            "@shared": path.resolve(__dirname, "shared"), // <-- shared folder at root
            "@assets": path.resolve(__dirname, "attached_assets"), // adjust if assets exist
        },
    },
    build: {
        outDir: path.resolve(__dirname, "dist"), // <-- Build to root/dist for Railway
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
                }
            }
        }
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
