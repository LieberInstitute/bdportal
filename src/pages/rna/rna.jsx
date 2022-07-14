import $ from "jquery";
import {useEffect, useState} from "preact/hooks";
//import {rGlobs, RDataProvider, FltCtxProvider, useFltCtxUpdate, useRData} from '../../comp/RDataCtx';
//import { rGlobs, changeXType, useRData }  from '../../comp/RDataCtx';
import './style.css';
import RnaSelect from './RnaSelect';
import RnaExplore from './RnaExplore';
import RnaReports from './RnaReports';
import { rGlobs, changeXType, useRData }  from '../../comp/RDataCtx';
// Note: `user` comes from the URL, courtesy of our router

const RnaPages = ({ params }) => {
	let tab=params.tab
	//console.log("--- Rna Pages tab requested:", tab)
	if (tab!=='exp' && tab!=='rep') tab='sel'

	const [, , , dataLoaded] = useRData()
	if (!dataLoaded) return <h3>Loading..</h3>

	if (rGlobs.selXType!=1) {
		rGlobs.validSelection=false;
	}
	changeXType(1);


	return tab==='sel' ? <RnaSelect /> :
	    ( tab=='exp' ? <RnaExplore /> :  <RnaReports />)

  /* // used to do it like this, likely not needed anymore
	return (<>
		 <RnaSelect style={{ display: tab==="sel" ? "block" : "none" }} />
		 <RnaExplore style={{ display: tab==="exp" ? "block" : "none" }} />
		 <RnaReports style={{ display: tab==="rep" ? "block" : "none" }} />
	   </>) */
}

export default RnaPages;
