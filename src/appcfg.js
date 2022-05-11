/* eslint-disable no-undef */

// -- for routing and webpack uncomment this:
//export const APP_BASE_URL = cfg_APP_BASE_URL
export const APP_BASE_URL=import.meta.env.BASE_URL
//console.log("#-#-#-#-#-#-#-#- appcfg: mode=", import.meta.env.MODE, " base_url:", import.meta.env.BASE_URL)
//-- routing for the Link elements is in: app.js
export function fixBasePath(p) {
	let pre=APP_BASE_URL.substring(1)
	if (pre.length>0 && p.indexOf(pre)==0)
       return p.substring(pre.length)
	return p
}
