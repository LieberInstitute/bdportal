import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
//import {rGlobs, RDataProvider, FltCtxProvider, useFltCtxUpdate, useRData} from '../../comp/RDataCtx';
import { rGlobs, changeXType, useRData }  from '../../comp/RDataCtx';
import './style.css';
import RnaSelect from './RnaSelect';
import RnaExplore from './RnaExplore';
import RnaReports from './RnaReports';
import $ from "jquery";
// Note: `user` comes from the URL, courtesy of our router

const RnaPages = ({ params }) => {
	let tab=params.tab
	if (tab!=='exp' && tab!=='rep') tab='sel'
	const [, , , dataLoaded] = useRData()
	if (!dataLoaded) return <h3>Loading..</h3>
	// data loaded, we are safe to show the pages for this data type
	changeXType(1);
	return (<div>
		 <RnaSelect style={{ display: tab==="sel" ? "block" : "none" }} />
		 <RnaExplore style={{ display: tab==="exp" ? "block" : "none" }} />
		 <RnaReports style={{ display: tab==="rep" ? "block" : "none" }} />
	   </div>)
}

export default RnaPages;
