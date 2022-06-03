import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
//const host = process.env.HOME;
const host = require('os').hostname()
let auth_proxy='http://gdebsrv:16443'
let mail_proxy='http://gdebsrv:16244'
let pgdb_proxy='http://localhost:4095'
if (host.match(/^linwks/) || host.match(/^srv/)) {
  //dev at LIBD:
   auth_proxy='http://192.168.77.16:16600'
   mail_proxy='http://192.168.77.16:1244'
   pgdb_proxy='http://localhost:4095'
}
console.log("~~~~~~~ vite.config:   NODE_ENV=", process.env.NODE_ENV)
export default defineConfig({
  plugins: [ preact() ],
  // base: "/", -- set the base to something else if needed
  server: {
    port:8080,
    proxy: {
      '/auth':auth_proxy,
      '/mail': mail_proxy,
      '/pgdb': pgdb_proxy,
      '/ruthere': pgdb_proxy,
      '/rstaging': pgdb_proxy,
      '/pgplrinit': pgdb_proxy
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
