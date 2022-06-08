import $ from 'jquery'
import { h, render } from 'preact'
import {useEffect, useState, useRef} from "preact/hooks"
import './app.css'
//import 'bootstrap-slider/dist/css/bootstrap-slider.min.css';
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import {Header, navRoutes} from './comp/header';
import { Container } from 'reactstrap';
import {rGlobs, cfg, RDataProvider, FltCtxProvider } from './comp/RDataCtx';
// Code-splitting is automated for `routes` directory

import MetPages from './pages/met/met';
import RnaPages from './pages/rna/rna';
import GenoPages from './pages/geno/geno';
import LongRnaPages from './pages/lrna/lrna';
import ScRnaPages from './pages/scrna/scrna';
import EqtlPages from './pages/eqtl/eqtl';
import BrSelPages from './pages/bmatrix/mx';
import {APP_BASE_URL, fixBasePath} from './appcfg'
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
    const [abspage, setLocation] = useLocation();
    const page=fixBasePath(abspage)

	return(<div id="app" className="page">
        <Header page={page} />
		<Container fluid className="content"> 
		<FltCtxProvider>
           <RDataProvider>
			<Router base={`${APP_BASE_URL}`} >
			 <Switch>
				<Route path="/brsel/:tab" component={BrSelPages} />
				<Route path="/rnaseq/:tab" component={RnaPages} />
				<Route path="/methyl" component={MetPages} />
				<Route path="/longrna" component={LongRnaPages} />
				<Route path="/scrna"  component={ScRnaPages} />
				{/*
				<GenoPages path="/genotyp" />
				<EqtlPages path="/eqtl" /> 
				*/}
				<Route path="/rnaseq"> <Redirect to="/rnaseq/sel" /> </Route>
				<Route path="/brsel"> <Redirect to="/brsel/matrix" /> </Route>
				<Route path="/"> <Redirect to="/brsel/matrix" /> </Route>
			 </Switch>
			</Router>
		  </RDataProvider>
          </FltCtxProvider>
   		</Container>
	</div>)
}

export default App;
