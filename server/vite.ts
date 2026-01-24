import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config.js";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const viteLogger = createLogger();
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // ✅ Fix for Node/Railway

export async function setupVite(server: Server, app: Express) {
  // Register API routes here, before Vite middlewares
  const { registerRoutes } = await import("./routes.js");
  await registerRoutes(server, app);

  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    // Skip API routes - let them be handled by Express routes
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname, // ✅ Use __dirname instead of import.meta.dirname
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e: any) {
      vite.ssrFixStacktrace(e as Error);
      const errorMessage = e?.message || String(e) || 'Vite error';
      console.error('Vite error:', errorMessage);
      next(e);
    }
  });
}
