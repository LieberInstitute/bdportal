import './header.css';
import { DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown, Nav, NavItem } from 'reactstrap'
import { useEffect, useState, useCallback } from "preact/hooks"
//import {useLocation, Link, useRoute } from 'wouter-preact'
import { APP_BASE_URL, MW_SERVER, AUTH_SERVER, COMMIT_HASH, COMMIT_DATE } from '../appcfg'

import { rGlobs, useLoginCtxUpdate, logAction } from './RDataCtx';

import imgLogo from '/assets/logo.svg'
import imgBands from '/assets/bands.png'
import imgBandsR from '/assets/bands_r.png'
import imgBrCirc from '/assets/brain_encircled.svg'

//import { DlgLogin } from './DlgLogin';
import { DlgRLogin } from './DlgRLogin';
import { DlgConfirm } from './DlgConfirm';
import axios from 'axios'

export const navRoutes = {
  brsel: [1, "Brain Set Builder", ["matrix", "Select"], ["browse", "Browse"]],
  //rna: [2, "Bulk RNAseq", ["sel", "Select"], ["exp", "Explore"], ["rep", "Reports"]],
  rna: [2, "Bulk RNAseq", ["sel", "Select"], ["exp", "Explore"] ] ,
  dnam: [3, "DNA methylation"],
  lrna: [4, "long RNAseq"],
  default: 'brsel'
}

export const navDropDown = [];
// array of [pageId, pageOrd#, pageName, [tabId, tabName], [tabId2, tabName2], ..]
// sorted by order of listing

function navDDsetup() {
  if (navDropDown.length) return
  Object.keys(navRoutes).forEach(k => {
    if (k !== 'default') {
      const kd = navRoutes[k]
      navDropDown.push([k, ...kd])
    }
  })
  navDropDown.sort((a, b) => (a[1] - b[1]))
}

// returns the current hash location (excluding the '#' symbol)
export function currentLoc() {
  //console.log(" currentLoc() called with windows.location", window.location)
  return (window.location.hash.replace("#", "") || "/")
}

function navigate(to) {
  //console.log("~~~~ asked to navigate to:", to)
  window.location.hash = to;
}

export function useHashLoc() {
  const [loc, setLoc] = useState(currentLoc());
  useEffect(() => {
    //initialize other structures
    const handler = () => setLoc(currentLoc());
    // subscribe on hash changes
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  //const navigate = useCallback(to => (window.location.hash = to), []);
  return [loc, navigate];
}

export function currentPageTab() {
  //const loc=window.location.hash.replace("#", "") || "/"
  return parsePageTab(currentLoc())
}

export function parsePageTab(loc) {
  // assume post-hash location:  /page[/tab]
  //console.log("<<<< parsePageTab received loc:",loc);
  //tab can be undefined - check defaults
  if (!loc) return ([navRoutes.default])
  const r = []
  let pt = loc
  while (pt.charAt(0) == '/') pt = pt.substring(1)
  if (pt.length == 0) { r[0] = navRoutes.default; return r }
  //remove any double slashes
  pt = pt.replace('//', '/')
  while (pt.length && pt.charAt(pt.length - 1) == '/') pt = pt.substring(0, pt.length - 1)
  return (pt.split('/'))
}


function ServerStatus( ) {
  const [status, setStatus]=useState('checking status..')
  const [pgstatus, setPgStatus]=useState('...')
  //console.log(" using mw-server: ", MW_SERVER)
  useEffect(() => {

    axios.get(`${MW_SERVER}/ruthere`, { timeout: 1500 }).then((res) => {
        //console.log(res.data);
        setStatus(res.data);
    })
    .catch( err => {
        console.log("TIMEOUT reached!")
        setStatus('not connected')
    })
   axios.get(`${MW_SERVER}/pgplrinit`, { timeout: 10000 }).then((res) => {
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
   {status} [{pgstatus}] <span class="allow-select" style="color:#a88;position:relative;font-size:11px;top:0px;">{COMMIT_HASH}-{COMMIT_DATE}</span>
  </div>)
}


export function Login({ login }) {
  const [loginModal, setLoginModal] = useState(false)
  const [logoutAsk, setLogoutAsk] = useState(false)

  function toggleLoginDlg() { setLoginModal(!loginModal) }
  function toggleLogoutAsk() { setLogoutAsk(!logoutAsk) }

  const [auth, setAuth] = useState(['', '']) //user, jwt

  const loginStateUpdate=useLoginCtxUpdate();


  function loginoutDlg() {
    if (!auth[1]) {//no authenticated user
      setLoginModal(true)
    } else { //do you want to logout?
      setLogoutAsk(true)
    }
  }

  function logout() {
    setAuth(['', ''])
    //explicit logout:
    loginStateUpdate('','')
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function onLogin(user, token) {
    //const headers = { "Access-Control-Allow-Origin": "*"}
    setAuth([user, token])
    //rGlobs.login=user
    //rGlobs.login_jwt=token
    loginStateUpdate(user, token)
    return true;
   }

  useEffect(() => {
    setLoginModal(true) //set this to true to ask for login at startup!
  }, []) //run only once!
  //<span style="border:1px solid #ccc;background-color:#eee;font-size:12px;padding:1px 3px;"
  //   onClick={ ()=>checkLogin( user, pass ) } > tst </span>
  return (<>
    <span className="navlogin" onClick={() => loginoutDlg()} >
      {auth[1] ? auth[0] : "Login"}
    </span>
    <DlgRLogin isOpen={loginModal} toggle={toggleLoginDlg} onLogin={onLogin} title="Log In" />
    <DlgConfirm isOpen={logoutAsk} toggle={toggleLogoutAsk} onConfirm={logout} title="Logout" />
  </>)
}

export function navigateTo(page, tab) { //subtab? on RnaExplore for example
  //const basePath = APP_BASE_URL
  window.location.hash = `${page}/${tab}`;
}

export function hrefTo(page, tab) {
  const basePath = APP_BASE_URL
  return `${basePath}#/${page}/${tab}`
}

export function Header({ page, tab, menuClick }) {

  //const [absloc, setLocation] = useHashLoc()
  navDDsetup()
  const basePath = APP_BASE_URL
  //const location=fixBasePath(absloc)
  //console.log("[Header] location is: ", location, "  page is:", page)

  function ddClick(pageId, pageNum) {
    if (pageId == page) return //current item clicked
    if (menuClick || typeof menuClick !== 'function')
      menuClick(pageId, pageNum) //should navigate to `${basePath}/#/${pageId}` and update props
  }


  function showReadMe() {
    let basePath = APP_BASE_URL
    if (basePath=='/') basePath='';
    window.open(`${basePath}/bdportal.readme.html#${page}-${tab}`, "LIBDPortal help")
  }

  const pageNav = navRoutes[page] // [pageOrd#, pageTitle [,  [ tabId1, tabLabel1], [tabId2, tabLabel2], ...] ]
  if (!pageNav) {
    return (<h1> Navdata for page ${page} not found!</h1>)
  }
  const tabs = pageNav.slice(2)
  if (!tab && tabs.length) {
    tab = tabs[0][0]
  }


  // -- disable items beyond i==1 in drop down menu:
  //<DropdownItem key={i} disabled={i>1} onClick={ () => ddClick(t[0], t[1])}>
  return (
    <Nav className='bg-light d-flex align-items-center navheader flex-nowrap noselect'>
      <a href='http://www.libd.org'><img alt="logo" src={imgLogo} style={{ height: "2rem" }} /></a>
      <span style={{ height: '100%', padding: '0.5rem 1rem' }} > </span>
      <UncontrolledDropdown nav inNavbar className="p-0 m-0 ddtsel">
        <DropdownToggle className="navdbtsel v-100 m-2" nav caret>
          {pageNav[1]}
        </DropdownToggle>
        <DropdownMenu className="navddlst">
          {navDropDown.map((pd, i) => (
            <DropdownItem key={i} disabled={i > 1} onClick={() => ddClick(pd[0], pd[1])}>
              {pd[2]}
            </DropdownItem>
          )
          )
          }
        </DropdownMenu>
      </UncontrolledDropdown>

      <div class="navtab-box flex-nowrap">
         <ServerStatus />
        {tabs.length > 0 && tabs.map((t) => (
          <NavItem className={t[0] === tab ? "navtab selected" : "navtab"} key={t[0]} id={t[0]}>
            {/* <Link activeClassName="active" href={`/${t[0]}`}>{t[1]}</Link> */}
            <div>
              {/* <a href={`${basePath}#/${page}/${t[0]}`}>{t[1]}</a> */}
              <a href={hrefTo(page,t[0])}>{t[1]}</a>
            </div>
          </NavItem>
        ))}
      </div>

      <NavItem className="ml-auto nav-right">
        <button class="app-btn-help" style="margin-right:24px;" onClick={showReadMe}>&nbsp;Guide&nbsp;</button>

        <img alt="bands" src={imgBands} className="navimgbands" />
        <span className="navtitle" onClick={showReadMe}>LIBData Portal</span>
        <img alt="bands_r" src={imgBandsR} className="navimgbands" />
        {/* <span className="navlogin">Login</span> */}
         <Login />
        <img alt="brainlogo" src={imgBrCirc} style={{ height: "2rem", paddingRight: "0.5rem" }} />
      </NavItem>
    </Nav>
  )
}
