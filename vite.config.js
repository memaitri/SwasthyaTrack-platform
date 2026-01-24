"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
const vite_plugin_runtime_error_modal_1 = __importDefault(require("@replit/vite-plugin-runtime-error-modal"));
exports.default = (0, vite_1.defineConfig)({
    root: path_1.default.resolve(__dirname, "client/src"), // <-- Vite root points inside client/src
    plugins: [
        (0, plugin_react_1.default)(),
        (0, vite_plugin_runtime_error_modal_1.default)(),
        ...(process.env.NODE_ENV !== "production" &&
            process.env.REPL_ID !== undefined
            ? [
                // For Replit only, leave async imports as-is
                await Promise.resolve().then(() => __importStar(require("@replit/vite-plugin-cartographer"))).then((m) => m.cartographer()),
                await Promise.resolve().then(() => __importStar(require("@replit/vite-plugin-dev-banner"))).then((m) => m.devBanner()),
            ]
            : []),
    ],
    resolve: {
        alias: {
            "@": path_1.default.resolve(__dirname, "client/src"), // <-- @ points to src folder
            "@shared": path_1.default.resolve(__dirname, "shared"), // <-- shared folder at root
            "@assets": path_1.default.resolve(__dirname, "attached_assets"), // adjust if assets exist
        },
    },
    build: {
        outDir: path_1.default.resolve(__dirname, "dist"), // <-- Vercel expects dist at root
        emptyOutDir: true,
        sourcemap: false,
    },
    server: {
        fs: {
            strict: true,
            allow: [path_1.default.resolve("./lib")],
            deny: ["**/.*"],
        },
        allowedHosts: true,
    },
});
