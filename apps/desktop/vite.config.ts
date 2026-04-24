import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri requires a fixed port so its webview can locate the dev server.
// https://tauri.app/v2/guides/develop/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2021",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
