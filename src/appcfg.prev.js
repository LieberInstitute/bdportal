/* eslint-disable no-undef */
export const APP_BASE_URL = cfg_APP_BASE_URL
//-- routing for the Link elements is in: app.js
export function fixBasePath(p) {
	const pre=APP_BASE_URL
	if (pre.length>0 && p.indexOf(pre)==0)
       return p.substring(pre.length)
	return p
}
