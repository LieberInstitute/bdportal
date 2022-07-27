/* eslint-disable react/no-danger */
/* eslint-disable no-lonely-if */
import $ from 'jquery';
import { h } from 'preact';
import { useEffect, useState, useRef, useReducer } from "preact/hooks";
import '../../comp/ui.css';
import './style.css';

import {
  useFltCtx, useFltCtxUpdate, useRData, getFilterData, getFilterSet, getFilterCond,
  applyFilterSet, applyFilterCond, clearFilters, dtFilters, getDatasetCitation, getDatasetName, 
  getDatasetDegFile, rGlobs, applyBrList, clearBrListFilter, getBrListFilter, anyActiveFilters, getFilterAgeRange,
  getFilterNames, saveStaticDataFile, arraySMerge} from '../../comp/RDataCtx'

import { FltMList } from '../../comp/FltMList'
import { Row, Col, Button, Label, Input, CustomInput } from 'reactstrap'
import { ToastBox } from '../../comp/ToastBox'
import RSelSummary from '../../comp/RSelSummary'
import AgeDualPanel from '../../comp/AgeDualPanel'
import { clearTooltips, setupTooltips } from '../../comp/ui';


function DSetInfo ( { dix } ) {

  function prepRefHtml(ref) {
    // ref=ref.replace(/\|/g, "<br>")
    let rl = ref.trim().split(/\|/)
    // 0 - authors | 1 - title | 2-journal | 3,4 = url:check prefixes
    if (rl[2]) if (rl[2].length < 3) rl[2] = ""; else rl[2] = `<i>${rl[2]}</i>`;
    for (let i = 3; i < rl.length; i++) {
      let u = rl[i].split(/:/);
      if (u && u.length > 1) {
        u[0] = u[0].toLowerCase()
        switch (u[0]) {
          case 'doi': u[1] = `<a href="https://doi.org/${u[1]}" target="_blank">DOI</a>`;
            rl[2] += `&nbsp;&nbsp;&nbsp;&nbsp;${u[1]}`;
            break;
          case 'pmid': u[1] = `<a href="https://pubmed.ncbi.nlm.nih.gov/${u[1]}" target="_blank">PMID</a>`;
            rl[2] += `&nbsp;&nbsp;&nbsp;&nbsp;${u[1]}`;
            break;
          case 'https': u[1] = `<a href="https:${u[1]}" target="_blank">url</a>`;
            rl[2] += `&nbsp;&nbsp;&nbsp;&nbsp;${u[1]}`;
            break;
        }
      }
    }
    return `<b>${rl[1]}</b><br/>${rl[0]},&nbsp;${rl[2]}`
  }

  async function onDegClick(fdl) {
    $("#degdlBtn").prop('disabled', true);
    saveStaticDataFile(fdl).then( ()=> {
          $("#degdlBtn").prop('disabled', false)
        }
     )
  }

  const degfile=dix>0 ? getDatasetDegFile(dix) : '';
  let degdl=(degfile.length>0) ? `degradation/${degfile}` : '';
  const ref = dix>0 ? getDatasetCitation(0, dix) : '';
  const refhtml = ref ? prepRefHtml(ref) : ''
  const dsname=getDatasetName(0, dix)
  
  //let degbtn='' 
  const showInfo=(dix && (ref.length>0 || degdl.length>0))
  //dt.html(`${refhtml}${degbtn}`);
  //dt.show()
  //console.log(" ~~~~ rendering DSetInfo with dix =", dix,  showInfo)
  return (<div id="dset-info-content" style={ { display: showInfo ? 'block' : 'none' }}> 
   <span class="dsetname"><i>{dsname}</i></span>
   <span dangerouslySetInnerHTML={ {__html: refhtml}} />
   <span style={ {display : degdl ? 'inline-block' : 'none' } }>
     <Button id="degdlBtn" title="Download Degradation matrix for this dataset" 
        className="btn-sm app-btn app-btn-deg" onClick={ () => onDegClick(degdl) }> Deg. data </Button>
   </span>
  </div>)
}

const RnaSelect = ({ style }) => {
  const [, , , dataLoaded] = useRData()
  const notifyUpdate = useFltCtxUpdate();

  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [clearCounter, setClearCounter] = useState(0)
  const [showHelp, setShowHelp] = useState(true)

  const [dsetInfo, setDsetInfo] = useState(0) //selected dset index (1-based, set to 0 if none OR multi selected)

  const refData=useRef( {
    ageRange:false, //default: age bins
    updList: { sex:0, age:0, reg:0, race:0, dset:0, dx:0, proto:0  },
    lastAutosel: { sex:0, age:0, reg:0, race:0, dset:0, dx:0, proto:0  }

  })
  const m=refData.current

  //const [ updating, setUpdating ] = useState(false) // when dataset selection/switching is instant, disable clicking while updating


  //const [brloaded, setBrLoaded] = useState(0)

  useEffect(() => {

    $('.toast').toast({ delay: 7000 })

    setupTooltips()
    return ()=>{ //clean-up code
       clearTooltips()
    }
  }, [])

  /*
  useEffect(() => {
    clearDsetInfo() //every re-render should clear that
    //$('.tooltip').hide();
  })*/

  if (!dataLoaded) return <h3>Loading..</h3>

  /*function clearDsetInfo() {
    const dt = $('#dset-info-content')
    dt.html(""); dt.hide()
  }*/

  function resetFilters() {
    //clearDsetInfo()
    setDsetInfo(0)
    clearFilters()
    setClearCounter(clearCounter + 1)
    notifyUpdate('clear')
    //simply triggers refresh, but for some components we want to trigger remount
  }

  function onDatasetClick(dix, fid, sel) {
    //let ref = getDatasetCitation(0, dix)
    //const dt = $('#dset-info-content')
    //const nsi=$("#help-msg")
    if (sel && sel.length > 1) {
      setDsetInfo(0)
      //dt.html("");
      //dt.hide()
      $("#dsMultiWarn").toast('show')
      return
    }
    if (sel.length <= 1) $("#dsMultiWarn").toast('hide');
    
    if (sel.length==1) {
      //console.log("setting DsetInfo => ", dix, sel, ref)
      setDsetInfo(dix)
      /*
      const refhtml = ref ? prepRefHtml(ref) : ''
      const dsname=getDatasetName(0, dix)
      let degbtn=''
      if (degdl) degbtn=`<span><Button class="btn-sm app-btn app-btn-deg" onClick={onDegClick}> Deg. data </Button></span>`
      dt.html(`<span class="dsetname"><i>${dsname}</i></span>${refhtml}${degbtn}`);
      dt.show()
      */
    } else {
      setDsetInfo(0)
      //dt.html("");
      //dt.hide()      
    }
  }

  const dta={ sex : getFilterData('sex'),
  //const dtaAge=getFilterData('age')
           dx: getFilterData('dx'),
          race: getFilterData('race'),
          proto: getFilterData('proto'),
          dset : getFilterData('dset'),
          reg : getFilterData('reg')
   }
  const brloaded = getBrListFilter().size
  const showsel = anyActiveFilters(true); //ignore checkboxes (genotyped/seq)

  function applyFilter(oset, fid) {
    //clearDsetInfo()
    const autosel=(fid=='dset' && Object.keys(oset).length<=2)
    // before updating the counts, clear previous autoselection
    if (autosel) {
      ['reg', 'proto', 'race', 'sex'].forEach( f=>{
        const fset=getFilterSet(f)
        if (fset.size==1 && fset.has(m.lastAutosel[f])) {
          fset.clear()
          console.log(" ... clearing auto selection for", f)
          m.lastAutosel[f]=0
          m.updList[f]++;
        }
      })
    }
    applyFilterSet(fid) //this will call updateCounts!
    //counts should be updated now!
    if (autosel) {
          //auto select non-zero reg, proto ONLY if ONLY ONE item has non-zero counts
          ['reg', 'proto', 'race', 'sex'].forEach( f=>{
            const fset=getFilterSet(f)
            if (fset.size==0) { //no previous selection, auto select if obvious
              const fd=getFilterData(f)
              const nzix=[]
              fd.forEach( d=>{
                 if (d[1]>0) nzix.push(d[3])
              })
              if (nzix.length==1) {
                fset.add(nzix[0])
                m.lastAutosel[f]=nzix[0]
                m.updList[f]++;
              }
            }
          })
    }
    notifyUpdate(fid)
  }

  function onAgeSelection(customRange) {
    notifyUpdate(customRange ? 'age-range' : 'age')
    m.ageRange=customRange
  }

  function onBrListLoad(brlist) {
    if (!brlist || brlist.length == 0) {
      //clearDsetInfo()
      //clearFilters()
      clearBrListFilter()
      setClearCounter(clearCounter + 1)
      notifyUpdate('clear-brlist')
      //setBrLoaded(0)
      return 0
    }
    const n = applyBrList(brlist)
    //since the above is clearing the filters:
    setClearCounter(clearCounter + 1)
    notifyUpdate('brlist')
    return n
  }

  // prep selection sheet as per R.'s instructions
  // Note: none-selected means ALL selected
  // (for my sanity, only Dataset and Dx filters are REQUIRED to have a selection)
  let selectionSheet = null
  const sscols=[] //array of 2-column tables that will be joined later
  let allSet=true; //actually just Dx and Dataset are enough..
  rGlobs.validSelection=false;
  ['dx', 'sex', 'age', 'race', 'reg', 'dset', 'proto'].forEach( (fid)=>{
      if (!allSet) return
      if (fid==='age' && m.ageRange) {
              const range=getFilterAgeRange()
              if (range.length==2) {
                sscols.push[ [[`${range[0]}..${range[1]}`],[1]] ]
              } else {
                //allSet=false;
                sscols.push[ [['-1..120'],[1]] ]
              }
              return
      }
      //regular sets
      const fset=getFilterSet(fid)
      
      if (fset.size==0 && (fid=='dx' || fid=='dset')) {
        allSet=false; return        
      }
      //for everything else, none selected means all selected

      const fnames=getFilterNames(fid)
      const isAllSel= (fset.size==0 ? 1 : 0) //none selected means all selected
      let selarr=[]
      if (fid==='age') {
        selarr=fnames.slice(1).map(
           (n, i) => [ n, fset.has(i+1) ? 1 : isAllSel ]
         )
         sscols.push(selarr)
         return
      }
      selarr=dta[fid].map(
         fd => [ fnames[fd[3]], fset.has(fd[3]) ? 1 : isAllSel ]
        )
      sscols.push(selarr)
   })

   if (allSet) {
     rGlobs.validSelection=true;
     // console.log(" validSelection TRUE")
     selectionSheet=[ [ 'Diagnosis', 'Diagnosis_selected', 'Sex', 'Sex_selected',
     'Age', 'Age_selected', 'Ancestry', 'Ancestry_selected', 'Brain_Region', 'Brain_Region_selected',
      'Datasets', 'Datasets_selected', 'Protocols', 'Protocols_selected' ] ];
     arraySMerge(selectionSheet, sscols)
     //console.log(" selectionSheet :", selectionSheet)
     //TODO: in DlgDownload -> add genes if any save csv
   } else selectionSheet=null
  
   //TODO: in RelSummary check props.selsheet to display Export/Explore buttons

  //console.log("  ~~~~~~~~~~~ RnaSelect page rendering! with sx fset =",getFilterSet('sex'), "  key =", sxkey)
  return (<div class="col-12 d-flex flex-nowrap flex-column">
    <Row className="pt-0 mt-0 pb-0 mb-0 justify-content-center flex-nowrap">
      <Col xs="2" className="d-flex flex-column m-0 p-0 pl-1 ml-1 colDemo align-self-stretch justify-content-center">
        <Row className="d-flex position-relative mb-0 pb-0 pl-0 justify-content-start align-self-stretch">
          <Col xs="7" className="d-flex justify-content-start align-items-center pl-0">
            <Button outline color="danger" className="btn-sm align-self-center ml-0" onClick={resetFilters}
              data-toggle="tooltip" title="Clear all selections"
              style="line-height:80%;font-size:80%">Clear</Button>
          </Col>
          <Col className="d-flex m-0 p-0 ml-0 align-self-start position-relative" style="height:32px;">
            <Row className="d-flex justify-content-start align-items-center w-100">
              {/*<Button className="btn-sm btn-light align-self-center app-btn-help ml-4" onClick={() => setShowHelp(!showHelp)}
                data-toggle="tooltip" title="Toggle help text display">?</Button> */}
              {showHelp ? <div id="help-msg" class="app-help-panel align-self-center">
              <span class="info-tx-apply">Apply</span> selections in the category panels below
              to access sample data.
              </div> : null}
            </Row>

          </Col>
        </Row>
      </Col>
      <Col className="pl-0 pt-0 mt-1 align-self-start top-info-panel">
        <div id="dset-info"> <DSetInfo dix={dsetInfo} /> </div>
      </Col>
      <Col xs="4" className="d-flex flex-fill" style="z-index:-1;">
      <Row className="m-0 p-0 mr-1 pr-1 d-flex justify-content-start"> </Row>
      </Col>
    </Row>
    <Row className="flex-grow-1 pt-0 mt-0 justify-content-center flex-nowrap">
      <Col xs="3" className="colDemo" >
        <Col className="d-flex flex-column col-vscroll"  >
          <Row className="d-flex justify-content-start">
            <FltMList key={`dx${clearCounter}_${m.updList['dx']}`} id="dx" width="15em" height="6.9em" data={dta.dx} filter={getFilterSet} onApply={applyFilter} updateFilter />
          </Row>
          <Row className="d-flex justify-content-start">
            <FltMList key={`sx${clearCounter}_${m.updList['sex']}`} id="sex" type="htoggle" width="15em" data={dta.sex} filter={getFilterSet} onApply={applyFilter} updateFilter />
          </Row>
          <AgeDualPanel key={`age${clearCounter}_${m.updList['age']}`} width="15em" onAgeSelection={onAgeSelection} />
          <Row className="d-flex justify-content-start" style="margin-top:2px;">
            <FltMList key={`race${clearCounter}_${m.updList['race']}`} id="race" width="15em" height="5.5rem" data={dta.race} filter={getFilterSet} onApply={applyFilter} updateFilter />
          </Row>
        </Col>
      </Col>
      {/*  middle column -- datasets, regions, protocols */}
      <Col className="pt-0 mt-0 align-self-start" style="max-width:26rem">
        <Row className="mt-0 pt-0">
          <Col className="pt-0 mt-0">
            <Row className="pt-0 mt-0">
              <FltMList key={`ds${clearCounter}_${m.updList['dset']}`} id="dset" height="11em" width="25em" type="faketoggle" nocollapse class="fl-inset lg-sq"
                data={dta.dset} filter={getFilterSet} onApply={applyFilter} updateFilter onClickItem={onDatasetClick} />
            </Row>
            <Row className="d-flex justify-content-start flex-nowrap">
              <Col className="p-0 m-0" style="max-width:15.2em;">
                <FltMList key={`reg${clearCounter}_${m.updList['reg']}`} id="reg" width="14rem" height="18rem" data={dta.reg} filter={getFilterSet} onApply={applyFilter} updateFilter />
              </Col>
              <Col className="p-0 m-0">
                <FltMList key={`prot${clearCounter}_${m.updList['proto']}`} id="proto" type="toggle" nobars width="10.4em" data={dta.proto} filter={getFilterSet} onApply={applyFilter} updateFilter />
              </Col>
            </Row>
          </Col>
        </Row>
      </Col>
      {/* -- right column: RSelSummary  -- */}
      <Col xs="4" className="d-flex flex-fill" >
        <Row className="pt-0 mt-0 d-flex flex-fill flex-grow-1 justify-content-center align-items-start">
          <RSelSummary brloaded={brloaded} onBrList={onBrListLoad} selsheet={selectionSheet} />
        </Row>
      </Col>
      <ToastBox id="dsMultiWarn" title="Warning" text="Batch effect should be considered when selecting samples from multiple datasets." />
    </Row>
  </div>)
}

export default RnaSelect;