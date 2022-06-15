import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
//const host = process.env.HOME;
const host = require('os').hostname()
process.env.VITE_HOST=host;

let auth_proxy='http://gdebsrv:16443'
let mail_proxy='http://gdebsrv:16244'
let pgdb_proxy='http://localhost:4095'

export default defineConfig(({ command, mode }) => {
  const devmode=(mode=='development')
  let nodemw_srv= devmode ? 'http://localhost:4095' : 'http://gdebsrv:4095';
  if (host.match(/^linwks/) || host.match(/^srv/)) {
    //dev at LIBD:
     auth_proxy='http://192.168.77.16:16600'
     mail_proxy='http://192.168.77.16:1244'
     //pgdb_proxy='http://192.168.77.16:4095'
     pgdb_proxy='http://10.17.9.59:4095'
     //if
     //nodemw_srv=devmode ? 'http://localhost:4095' : 'http://192.168.77.16:4095'
     nodemw_srv=devmode ? 'http://localhost:4095' :  'http://10.17.9.59:4095'
  }
  
  process.env.VITE_NODESRV=nodemw_srv;

  if (devmode)
     console.log("~~~~~~~ vite.config DEV mode: vite proxy set to VITE_NODESRV =", nodemw_srv)

  else
     console.log("~~~~~~~ vite.config Build mode: VITE_NODESRV =", nodemw_srv)

  // - - finally, return mode-dependent config:
  return {
    plugins: [ preact() ],
    // base: "/", -- set the base to something else if needed
    server: {
      port:8080,

      proxy: { //only during development
        /*
        '/auth':auth_proxy,
        '/mail': mail_proxy,
        '/pgdb': pgdb_proxy,
        '/ruthere': pgdb_proxy,
        '/rstaging': pgdb_proxy,
        '/pgplrinit': pgdb_proxy
        */
      '^/(pgdb|ruthere|pgplrinit|rstaging)' : nodemw_srv
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
