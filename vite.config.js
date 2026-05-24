import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
//const host = process.env.HOME;
const host = require('os').hostname().toLowerCase();
process.env.VITE_HOST=host;

let login_srv='https://dev.libd.org'

let local_login_srv=0; //set this to 1 for local login dialog development
let melokalia_login=0;
let remote_h2gw=0; //remote middleware develpment at home through wireguard

export default defineConfig(({ command, mode }) => {
  const devmode=(mode=='development')
  let nodemw_srv='http://localhost:4095';
  if (devmode) {
     if (melokalia_login) {
        login_srv='https://dev.melokalia.us'
     } else if (local_login_srv) {
        if (host=='gryzen') login_srv='http://192.168.2.7:4080'
        else if (host=='glin') login_srv='http://192.168.2.2:4080'
        else if (host=='linwks34') login_srv='http://10.17.10.199:4080'
     }
  }
  if (host.match(/^linwks/) || host.match(/^srv/) || remote_h2gw ) {
    //--- dev at LIBD:
     if (devmode && remote_h2gw) {
        nodemw_srv='http://192.168.77.3:4095'
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nWARNING: dev mode points to middleware on", nodemw_srv)
        console.log("  if you want to run that mw locally, set remote_h2gw=0 in vite.config.js")
     }
  }

  process.env.VITE_LOGINSRV=`${login_srv}/if_rlogin`;

  if (devmode) {
     console.log(`~~~~~~~ vite.config DEV mode: loginsrv = ${process.env.VITE_LOGINSRV}\n\t\t API proxy target =`, nodemw_srv)
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
