import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
//const host = process.env.HOME;
const host = require('os').hostname().toLowerCase();
process.env.VITE_HOST=host;

let remote_h2gw=0; //remote middleware develpment at home through wireguard

export default defineConfig(({ command, mode }) => {
  const devmode=(mode=='development')
  let nodemw_srv='http://localhost:4095';
  if (host.match(/^linwks/) || host.match(/^srv/) || remote_h2gw ) {
    //--- dev at LIBD:
     if (devmode && remote_h2gw) {
        nodemw_srv='http://192.168.77.3:4095'
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nWARNING: dev mode points to middleware on", nodemw_srv)
        console.log("  if you want to run that mw locally, set remote_h2gw=0 in vite.config.js")
     }
  }

  if (devmode) {
     console.log(`~~~~~~~ vite.config DEV mode: API proxy target =`, nodemw_srv)
  }
  else
     console.log(`~~~~~~~ ${host} vite.config Build mode: same-origin middleware API`)

  // - - finally, return mode-dependent config:
  return {
    plugins: [ preact() ],
    // base: "/", -- set the base to something else if needed
    server: {
      port:8080,

      proxy: {
        '/api': {
          target: nodemw_srv,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
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
  }
} );
