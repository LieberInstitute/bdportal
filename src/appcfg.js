/* eslint-disable no-undef */

// -- for routing and webpack uncomment this:
//export const APP_BASE_URL = cfg_APP_BASE_URL
export const APP_BASE_URL=import.meta.env.BASE_URL

// Node middleware is reached through a same-origin /api prefix.
// Production nginx proxies /bdportal/api/* to the local middleware.
const devmode=(import.meta.env.DEV===true)
const env_MWSRV=import.meta.env.VITE_MWSERVER
const basePath = APP_BASE_URL.replace(/\/$/, '')
const defaultMwServer = `${basePath}/api`
export const MW_SERVER = env_MWSRV ? env_MWSRV.replace(/\/$/, '') : defaultMwServer

export const COMMIT_DATE = import.meta.env.VITE_COMMIT_DATE.substring(2)
export const COMMIT_HASH = import.meta.env.VITE_COMMIT_HASH

//console.log("#-#-#-#-#-#-#-#- appcfg: mode=", import.meta.env.MODE, " base_url:", import.meta.env.BASE_URL)
if (devmode) {
   console.log("#-#-#-#-#-#-#-#-  meta.env", import.meta.env) // process.env.NODE_ENV)
   console.log("#-#-#-#-#-#-#-#-  MW_SERVER =", MW_SERVER) // process.env.NODE_ENV)
}
//-- routing for the Link elements is in: app.js
export function fixBasePath(p) {
	let pre=APP_BASE_URL.substring(1)
	if (pre.length>0 && p.indexOf(pre)==0)
       return p.substring(pre.length)
	return p
}
