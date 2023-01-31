import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
//const host = process.env.HOME;
const host = require('os').hostname().toLowerCase();
process.env.VITE_HOST=host;

let auth_proxy='http://gdebsrv.lan:16600'
let mail_proxy='http://gdebsrv.lan:16244'
let pgdb_proxy='http://localhost:4095'
let login_srv='https://dev.libd.org'

let local_login_srv=0; //set this to 1 for local login dialog development
let melokalia_login=0;
let remote_h2gw=0; //remote middleware develpment at home through wireguard

export default defineConfig(({ command, mode }) => {
  const devmode=(mode=='development')
  let nodemw_srv= devmode ? 'http://localhost:4095' : 'http://gdebsrv:4095';
  if (melokalia_login) {
     login_srv='https://dev.melokalia.us'
  } else if (devmode && local_login_srv) {
      if (host=='gryzen') login_srv='http://192.168.2.7:4080'
      else if (host=='glin') login_srv='http://192.168.2.2:4080'
      else if (host=='linwks34') login_srv='http://10.17.10.199:4080'
   }
  if (host.match(/^linwks/) || host.match(/^srv/) || remote_h2gw ) {
    //--- dev at LIBD:
     auth_proxy='http://192.168.77.16:16600'
     mail_proxy='http://192.168.77.16:1244'
     pgdb_proxy='http://192.168.77.16:4095'
     //pgdb_proxy='http://10.17.9.59:4095'
     //if
     //nodemw_srv=devmode ? 'http://localhost:4095' : 'http://192.168.77.16:4095'
     nodemw_srv=devmode ? 'http://localhost:4095' :  'http://10.17.9.59:4095'
     if (devmode && remote_h2gw) {
        nodemw_srv='http://192.168.77.3:4095'
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nWARNING: dev mode points to middleware on", nodemw_srv)
        console.log("  if you want to run that mw locally, set remote_h2gw=0 in vite.config.js")
     }
  }

  process.env.VITE_NODESRV=nodemw_srv;
  process.env.VITE_LOGINSRV=`${login_srv}/if_rlogin`;

  if (devmode) {
     console.log(`~~~~~~~ vite.config DEV mode: loginsrv = ${process.env.VITE_LOGINSRV}\n\t\t VITE_NODESRV =`, nodemw_srv)
  }
  else
     console.log(`~~~~~~~ ${host} vite.config Build mode: VITE_NODESRV =`, nodemw_srv)

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
      '^/(pgdb|auth|mail|ruthere|pgplrinit|rstaging|ulog|gtreq|stdata)' : nodemw_srv
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
