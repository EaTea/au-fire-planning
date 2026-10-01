import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite build and dev-server configuration.
// `base` is the sub-path GitHub Pages serves the site from, so asset URLs in the
// built `index.html` and the dev server both live under /au-fire-planning/.
export default defineConfig({
  plugins: [react()],
  base: "/au-fire-planning/",
});
