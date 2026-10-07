import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  base: "/",
  server: {
    proxy: {
      "/auth": "http://localhost:3000",
      "/users": "http://localhost:3000",
      "/notification": "http://localhost:3000",
      "/office_api": "http://localhost:3000",
      "/position_api": "http://localhost:3000",
      "/fire_incident_categories_api": "http://localhost:3000",
      "/fire_incident_subcategories_api": "http://localhost:3000",
    },
  },
});
