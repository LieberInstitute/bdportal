import $ from 'jquery'
import { h, render } from 'preact'
import {useEffect, useState, useRef} from "preact/hooks"
import './app.css'
//import 'bootstrap-slider/dist/css/bootstrap-slider.min.css';
import {Header, navRoutes} from './comp/header';
import { Container } from 'reactstrap';
import {rGlobs, RDataProvider, FltCtxProvider } from './comp/RDataCtx';
// Code-splitting is automated for `routes` directory
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

import MetPages from './pages/met/met';
import RnaPages from './pages/rna/rna';
import GenoPages from './pages/geno/geno';
import LongRnaPages from './pages/lrna/lrna';
import ScRnaPages from './pages/scrna/scrna';
import EqtlPages from './pages/eqtl/eqtl';
import BrSelPages from './pages/bmatrix/mx';
import { useRoute, Route, Router, Switch, Redirect, useLocation } from 'wouter-preact';

// this is like a useEffect hook that only executes the first render

const useComponentWillMount = (fn) => {
    const willMount = useRef(true)
    if (willMount.current && fn && typeof fn === 'function') 
	    fn()
    willMount.current = false
}
/*
function Redirect(props) {
	useComponentWillMount( () => {
		console.log("Redirecting to: ", props.to)
		route(props.to, true)
	})
	console.log("Redirect exec with props: ", props)
	return null; 
}
*/

function App() {
	//const [page, setPage]=useState(null);
    const [page, setLocation] = useLocation();

    //async function routeChange(e) {
	//   console.log('route changed to:', e.url);
	//   setPage(e.url);
       /*switch (e.url) {
		case '/profile':
		  const isAuthed = await this.isAuthenticated();
		  if (!isAuthed) route('/', true);
		  break;
	  }*/
	//}
	//<Router onChange={routeChange}>
	return(<div id="app" class="page">
        <Header page={page} />
		<Container fluid className="content"> 
		<FltCtxProvider>
           <RDataProvider>
			<Router>
				<Route path="/brsel/:tab" component={BrSelPages}/>
				<Route path="/rnaseq/:tab" component={RnaPages}/>
				<Route path="/methyl" component={MetPages}/>
				<Route path="/longrna" component={LongRnaPages}/>
				<Route path="/scrna"  component={ScRnaPages}/>
				{/*
				<GenoPages path="/genotyp" />
				<EqtlPages path="/eqtl" /> 
				*/}
				<Route path="/rnaseq" component={RnaPages}/>
				<Route path="/brsel" component={BrSelPages}/>
				<Route path="/" component={BrSelPages} />
			</Router>
		  </RDataProvider>
          </FltCtxProvider>
   		</Container>
	</div>)
}

render(<App />, document.getElementById('app'))