/* eslint-disable no-undef */

export const APP_BASE_URL = cfg_APP_BASE_URL
// vite:
//export const APP_BASE_URL=import.meta.env.BASE_URL

// node middleware server running on port 4095
//export const NODEMW_URL=process.env.NODE_ENV=='development' ? '' : 'http://localhost:4095';
//console.log("#$#$#$#$#$#$ NODE_ENV: ", process.env.NODE_ENV)
//-- routing for the Link elements is in: app.js
export function fixBasePath(p) {
	let pre=APP_BASE_URL.substring(1)
	if (pre.length>0 && p.indexOf(pre)==0)
       return p.substring(pre.length)
	return p
}
