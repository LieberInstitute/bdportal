import $ from "jquery";
import {useEffect, useState, useRef} from "preact/hooks";
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
  const refData=useRef( {
    xploreSection: 1, //last Explore section (Age Plot, Box plot)
    genelist: ['']// latest genelist entered in the last Explore section
   })
  //const m=refData.current;
	//console.log("--- Rna Pages tab requested:", tab)
	if (tab!=='exp' && tab!=='rep') tab='sel'

	const [, , , dataLoaded] = useRData()
	if (!dataLoaded) return <h3>Loading..</h3>

	if (rGlobs.selXType!=1) {
		rGlobs.validSelection=false;
	}
	changeXType(1);
  
	return tab==='sel' ? <RnaSelect /> :
	    ( tab=='exp' ? <RnaExplore mdata={refData.current} /> :  <RnaReports />)
}

export default RnaPages;
