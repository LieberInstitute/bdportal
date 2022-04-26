import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
//import {rGlobs, RDataProvider, FltCtxProvider, useFltCtxUpdate, useRData} from '../../comp/RDataCtx';
import { rGlobs, changeXType, useRData }  from '../../comp/RDataCtx';
import './style.css';
import BrMatrix from './brmatrix';
import BrBrowse from './brbrowse';
// Note: `user` comes from the URL, courtesy of our router

const BrSelPages = ({ params }) => {
	let tab=params.tab
	if (tab!=='browse') tab='matrix'
	const [, , , dataLoaded] = useRData()
	if (!dataLoaded) return <h3>Loading..</h3>
	// data loaded, we are safe to show the pages for this data type
	changeXType(0);
	return tab==='matrix' ? <BrMatrix /> :  <BrBrowse />
}

export default BrSelPages;