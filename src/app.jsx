import $ from 'jquery';
import Popper from 'popper.js';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import { render } from 'preact';

import {Header, navRoutes, parsePageTab, useHashLoc, currentLoc} from './comp/header'
import {Container, Col, Row, Nav, NavItem} from 'reactstrap';
import {useRef} from 'preact/hooks'
import { rGlobs, RDataProvider, FltCtxProvider, LoginCtxProvider } from './comp/RDataCtx'
//import {PageContent} from './pages/bmatrix/page'
import BrPages from './pages/br/br'
import RnaPages from './pages/rna/rna'
import LrnaPages from './pages/lrna/lrna'
import DnamPages from './pages/dnam/dnam'

import {APP_BASE_URL, fixBasePath} from './appcfg'

// this is like a useEffect hook that only executes the first render
const useComponentWillMount = (fn) => {
    const willMount = useRef(true)
    if (willMount.current && fn && typeof fn === 'function')
	    fn()
    willMount.current = false
}

function App() {
	const [location, setLocation] = useHashLoc();
	let [ page, tab ] = parsePageTab(location)
	//const basePath=APP_BASE_URL
	if (!tab) tab=''
	//const router=useRouter()
	//console.log("######## App location: ", location, `(${page},${tab})`)
	//const pageUrl=fixBasePath(location)

	function menuClick(pId, pNum) {
		//console.log("setting location to:", `${APP_BASE_URL}/${pId}`);
    setLocation(pId)
	}

	function getPage() {
    switch (page) {
		  case 'brsel': return  <BrPages params= { {tab: `${tab}` } } />;
		  case 'rna': return  <RnaPages params= { {tab: `${tab}` } } />;
		  case 'dnam': return  <DnamPages />;
		  case 'lrna': return  <LrnaPages />;
		}
		// default:
		return  <BrPages params= { {tab: {tab} } } />;
	}

	const goPages=getPage()
	// key={`${page}_${tab}`}
	return (<LoginCtxProvider>
     <Header page={page} tab={tab} menuClick={menuClick} />
		 <Container fluid className="content d-flex h-100">
		   <FltCtxProvider>
		    <RDataProvider>
				 { goPages }
 			 </RDataProvider>
		  </FltCtxProvider>
		 </Container>
     </LoginCtxProvider>
	);
}

render(<App />, document.getElementById('app'))