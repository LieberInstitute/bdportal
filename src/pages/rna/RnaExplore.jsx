import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
import './style.css';

// Note: `user` comes from the URL, courtesy of our router
const RnaExplore = ({ selData, style }) => {
    /*
 	useEffect(() => {
		let timer = setInterval(() => setTime(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
*/
	return (<div style={style}>
			<h3>RNA-Seq Data Exploration</h3>
			<p>Exploration functionality coming soon</p>		
     </div>);
}

export default RnaExplore;
