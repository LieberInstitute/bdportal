import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [ preact() ],
  // base: "/", -- set the base to something else if needed
  server: {
    port:8080,
    proxy: {
      '/auth':'http://gdebsrv:16443'
    }
  },
  assetsInclude: ['**/*.json.gz'],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});
