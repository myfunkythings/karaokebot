import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  base: process.env.VITE_APP_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@karaoke/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@karaoke/ui": path.resolve(__dirname, "../../packages/ui/src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    allowedHosts
  }
});
