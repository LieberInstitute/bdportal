import { h } from 'preact'
import $ from "jquery"
import {useEffect, useState} from "preact/hooks"
import './header.css';
//import { route } from 'preact-router';
//import { Link } from 'preact-router/match';
import {useLocation, Link } from 'wouter-preact'
import {APP_BASE_URL, fixBasePath} from '../appcfg'
import axios from 'axios'
import {DropdownMenu, DropdownToggle, DropdownItem, 
                  UncontrolledDropdown, Nav, NavItem} from 'reactstrap';

   //these are "router" paths (longer), not pages dirs
   // navRoutes are also used as 
export const navRoutes= { 
    brsel : [1, "Brain Matrix", { matrix: [1, "Matrix"], browse: [2, "Browser"] } ], 
    rnaseq : [2, "bulk RNAseq", { sel: [1, "Select"], exp: [2, "Explore"], rep: [3, "Reports"] }], 
    methyl : [3, "DNA methylation"],
    scrna : [4, "scRNAseq data"],
    genotyp : [5, "Genotype data"],
   longrna : [6, "long RNAseq data"] 
 }

function ServerStatus( ) {
  const [status, setStatus]=useState('checking status..')
  const [pgstatus, setPgStatus]=useState('...')

  useEffect(() => {
    axios.get('/ruthere', { timeout: 1500 }).then((res) => {
        //console.log(res.data);
        setStatus(res.data);
    })
    .catch( err => {
        console.log("TIMEOUT reached!")
        setStatus('not connected')
    })
   axios.get('/pgplrinit', { timeout: 10000 }).then((res) => {
      //console.log(res.data);
      setPgStatus(res.data);
    })
  .catch( err => {
      console.log("Postgres TIMEOUT!")
      setPgStatus(':(')
  })

}, [])
  return (
  <div style={{ position: "absolute", "font-size": "70%", color:"red", top:"4px" }}>
     {status} [{pgstatus}]
  </div>)
}


export function Header( {page} ) {
  const [absloc, setLocation] = useLocation();
  const location=fixBasePath(absloc)
	console.log("location is: ", location, "  page is:", page)
	useEffect( () => {
        function updateTabs() {
          $('.navtab').addClass('enabled').removeClass('selected');
          const [p, t]=splitRoute(page);          
          if (t) {
              //console.log("setting class selected to #"+t+" .navtab");
              $(`#${t}`).addClass('selected');
          }
        }
        if (page) updateTabs();
     }
  );

	function dtaXSelClick(lnk) {
    //console.log("---------- lnk clicked: ", lnk)
    let lnkitems=splitRoute(lnk);
    let pt=splitRoute(page);
    if (pt[0]===lnkitems[0]) return;
    console.log(`Routing to page: ${lnk}`);
    // limit for now:
     //route(`/${lnk}`);
    setLocation(`${APP_BASE_URL}/${lnk}`);
		//setPage(lnk)
		//history.push("/"+lnk)
	  }

	function sortNavMap(navmap, pre) { //returns sorted array of [ lnk, title, ord#, tab ]
		//input navmap MUST have the form: lnk: [ord#, title, subnav]
		let sorted=[];
		if (pre) pre+='/';
			else pre='';
		for (let v in navmap) {
		  let d=navmap[v];
		  sorted.push([pre+v, d[1], d[0], v]);
		}
		sorted.sort( (a, b) => {
		  return a[2] - b[2];
		})
		return sorted;
	  }
 
	function splitRoute(loc) {
    let elems=loc.split('/');
    if (elems.length) {
       if (elems[0]==='') elems.shift();
       if (elems[elems.length-1]==='') elems.pop();
    }
		return elems;
	  }
	
	const ddnavs = sortNavMap(navRoutes); //array of [lnk, title, ord#]
	
	let pagelnk=page;
	if (page && page.charAt(0)==='/')
	   pagelnk=page.substr(1);
    
    if (pagelnk) {
       //parse the tab out of the link, if there
       const [p,t] = splitRoute(pagelnk);
       if (t!=='_') {
         pagelnk=p;
       }
    }
    else pagelnk=ddnavs[0][0];
  
    let dt=navRoutes[pagelnk];
    if (!dt) {
       console.log("Error, page ",page, " does not map!");
       pagelnk=ddnavs[0][0];
       dt=navRoutes[pagelnk];
    }
    let selTitle=dt[1];
    let subpages=dt[2];
    let subtabs=null;
    if (subpages && Object.keys(subpages).length>0) {
      subtabs=sortNavMap(subpages, pagelnk);
	  //console.log("subtabs:", subtabs);
      // first entry MUST be same with ddnavs[0][0]
      //subtabs[0][0]=ddnavs[0][0];
    }

    //console.log("rendering Nav header...")

	return (
		<Nav className='bg-light d-flex align-items-center navheader flex-nowrap'>
		<a href='http://www.libd.org'><img alt="logo" src={`${APP_BASE_URL}/assets/logo.svg`} style={{ height: "2rem"}} /></a>
		<span style={{ height: '100%', padding: '0.5rem 1rem' }} > </span>
		<UncontrolledDropdown nav inNavbar className="p-0 m-0 ddtsel">
           <DropdownToggle className="navdbtsel v-100 m-2" nav caret>
             {selTitle}
           </DropdownToggle>
           <DropdownMenu style={{marginTop: "-0.4rem", left:"0.5rem"}}>
             {  ddnavs.map((t, i) => (
                 <DropdownItem key={i} disabled={i>1} onClick={ () => dtaXSelClick(t[0])}> 
                  {t[1]} 
                 </DropdownItem>
                 )
                ) 
             }
           </DropdownMenu>

         </UncontrolledDropdown>
 
        <div className="navtab-box flex-nowrap">
               <ServerStatus />
               { subtabs && subtabs.map((t) => (
                   <NavItem className="navtab" key={t[3]} id={t[3]}> 
				             <Link activeClassName="active" href={`${APP_BASE_URL}/${t[0]}`}>{t[1]}</Link>
                   </NavItem>
               ) ) }
        </div>
        
 		{/* <Link activeClassName="active" href="/">RNA-Seq</Link> 
   		  <Link activeClassName="active" href="/methyl">DNA methylation</Link>
		  <Link activeClassName="active" href="/genotyp">Genotypes</Link> */}

         {/* <NavItem className="ml-auto nav-right navtitle">
            <img alt="bands" src="../assets/bands.png" className="navimgbands" /> Data Portal&nbsp;
            <img alt="bands_r" src="../assets/bands_r.png" className="navimgbands" />
		</NavItem> */}
       <NavItem className="ml-auto nav-right">
		   <img alt="bands" src={`${APP_BASE_URL}/assets/bands.png`} className="navimgbands" /> 
		   <span className="navtitle">Data Portal</span>
           <img alt="bands_r" src={`${APP_BASE_URL}/assets/bands_r.png`} className="navimgbands" />
           <span className="navlogin">Login</span>
           <img alt="brainlogo" src={`${APP_BASE_URL}/assets/brain_encircled.svg`} 
                               style={{ height: "2rem", paddingRight:"0.5rem" }} />
         </NavItem>
		</Nav>
     )
}

export default Header;
