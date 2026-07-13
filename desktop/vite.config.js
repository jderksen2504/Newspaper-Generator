import { defineConfig } from "vite";

// Vite config: baut das Frontend nach `dist/`, das Tauri als `frontendDist` einbettet
export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
    // Tauri-Apps sind Single-Page — Vite macht das automatisch
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Tauri lädt die App über die tauri:// Protokoll — relative Pfade sind Pflicht
  base: "./",
  css: {
    // WICHTIG: Vite sucht standardmäßig die Verzeichnishierarchie nach
    // postcss.config.* hoch und würde die postcss.config.mjs aus dem
    // Monorepo-Root (Next.js-App mit @tailwindcss/postcss) finden — das
    // schlägt fehl, weil @tailwindcss/postcss in desktop/ nicht installiert ist.
    // Wir deaktivieren PostCSS hier explizit, da wir reines CSS ohne
    // Preprocessor verwenden.
    postcss: {
      plugins: [],
    },
  },
});
