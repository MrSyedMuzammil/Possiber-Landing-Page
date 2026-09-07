import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html",
        checkout: "checkout.html",
        privacy: "privacy.html",
        terms: "terms.html",
      },
    },
  },
});
