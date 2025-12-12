import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
import { rGlobs, changeXType, useRData }  from '../../comp/RDataCtx';
import './style.css';
import BrMatrix from './brmatrix';
import BrBrowse from './brbrowse';

const BrPages = ({ params }) => {
	let tab=params.tab
	if (tab!=='browse') tab='matrix'
	const [, , , dataLoaded] = useRData()
	//console.log("rendering BrSelPages with tab=",tab)
	if (!dataLoaded) {
		if (rGlobs.dataError) {
			return <div class="col-12"><h4>Data load failed</h4><pre style="white-space:pre-wrap">{rGlobs.dataError}</pre></div>
		}
		return <h3>Loading..</h3>
	}
	// data loaded, we are safe to show the pages for this data type
	changeXType(0);

	return tab==='matrix' ? <BrMatrix /> :  <BrBrowse />
}

export default BrPages;
