/* eslint-disable no-lonely-if */
import $ from 'jquery';
import { h } from 'preact';
import { useEffect, useState, useRef, useReducer } from "preact/hooks";
import '../../comp/ui.css';
import './style.css';

import {
  useFltCtx, useFltCtxUpdate, useRData, getFilterData, getFilterSet, getFilterCond,
  applyFilterSet, applyFilterCond, clearFilters, dtFilters, getDatasetCitation,
  applyBrList, clearBrListFilter, getBrListFilter, anyActiveFilters
} from '../../comp/RDataCtx'

import { FltMList } from '../../comp/FltMList'
import { Row, Col, Button, Label, Input, CustomInput } from 'reactstrap'
import { ToastBox } from '../../comp/ToastBox'
import RSelSummary from '../../comp/RSelSummary'
import AgeDualPanel from '../../comp/AgeDualPanel'

const RnaSelect = ({ style }) => {
  const [, , , dataLoaded] = useRData()
  const notifyUpdate = useFltCtxUpdate();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [clearCounter, setClearCounter] = useState(0)
  const [showHelp, setShowHelp] = useState(true)

  const refData=useRef( {
    updList: { sex:0, age:0, reg:0, race:0, dset:0, dx:0, proto:0  }
  })

  const m=refData.current

  //const [ updating, setUpdating ] = useState(false) // when dataset selection/switching is instant, disable clicking while updating


  //const [brloaded, setBrLoaded] = useState(0)

  useEffect(() => {
    $('[data-toggle="tooltip"]').tooltip({ delay: { show: 800, hide: 100 }, trigger: 'hover' })
    //$("body").tooltip({ selector: '[data-toggle=tooltip]' });
    $('.toast').toast({ delay: 7000 })
  }, [])

  useEffect(() => {
    clearDsetInfo() //every re-render should clear that
    //$('.tooltip').hide();
  })

  if (!dataLoaded) return <h3>Loading..</h3>

  function clearDsetInfo() {
    const dt = $('#dset-info-content')
    dt.html(""); dt.hide()
  }

  function resetFilters() {
    clearDsetInfo()
    clearFilters()
    setClearCounter(clearCounter + 1)
    notifyUpdate('clear')
    //simply triggers refresh, but for some components we want to trigger remount
  }

 
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

  function onDatasetClick(dix, fid, sel) {
    let ref = getDatasetCitation(0, dix)
    const dt = $('#dset-info-content')
    //const nsi=$("#help-msg")
    if (sel && sel.length > 1) {
      //dt.html('<span class="dset-info-warn"> Warning: selecting samples from more than one dataset! </span>');
      //dt.show()
      dt.html("");
      dt.hide()
      //if (nsi) nsi.show()
      $("#dsMultiWarn").toast('show')
      return
    }
    if (sel.length <= 1) $("#dsMultiWarn").toast('hide');
    if (sel.length && ref && ref.length > 0) {
      //hide the help-msg panel
      //if (nsi) nsi.hide()
      const refhtml = prepRefHtml(ref)
      dt.html(refhtml);
      dt.show()
    } else {
      dt.html("");
      dt.hide()
      //if (nsi) nsi.show()
    }
  }

  const dtaSex = getFilterData('sex')
  //const dtaAge=getFilterData('age')
  const dtaDx = getFilterData('dx')
  const dtaRace = getFilterData('race')
  const dtaProto = getFilterData('proto')
  const dtaDset = getFilterData('dset')
  const dtaReg = getFilterData('reg')
  const brloaded = getBrListFilter().size
  const showsel = anyActiveFilters(true); //ignore checkboxes (genotyped/seq)

  function applyFilter(oset, fid) {
    clearDsetInfo()
    applyFilterSet(fid) //this will call updateCounts!
    //counts should be updated now!
     if (Object.keys(oset).length>0) {
        /* if (fid!='sex') { // no, don't be patronizing to the user
             const fset=getFilterSet('sex')
             if (fset.size==0) {
              fset.add(1);fset.add(2)
              m.updList['sex']++
              //console.log(`  updated sx fset =`,getFilterSet('sex'))
             }
        }*/
        if (Object.keys(oset).length<=2 && fid=='dset') {
          //auto select non-zero reg, proto ONLY if ONLY ONE item has non-zero counts
          ['reg', 'proto', 'race', 'sex'].forEach( f=>{
            const fset=getFilterSet(f)
            if (fset.size==0) { //no previous selection
              const fd=getFilterData(f)
              const nzix=[]
              fd.forEach( d=>{
                 if (d[1]>0) nzix.push(d[3])
              })
              if (nzix.length==1) {
                fset.add(nzix[0]);
                m.updList[f]++;
              }
            }
          })
        }
    }
    notifyUpdate(fid)
  }

  function onAgeSelection(customRange) {
    notifyUpdate(customRange ? 'age-range' : 'age')
  }

  function onBrListLoad(brlist) {
    if (!brlist || brlist.length == 0) {
      clearDsetInfo()
      //clearFilters()
      clearBrListFilter()
      notifyUpdate('clear-brlist')
      //setBrLoaded(0)
      return 0
    }
    const n = applyBrList(brlist)
    notifyUpdate('brlist')
    return n
  }



  // prep selection sheet as per R.'s instructions
  const selectionSheet = []
  selectionSheet.push(['Diagnosis', 'Diagnosis_selected', 'Ancestry', 'Ancestry_selected',
    'Sex', 'Sex_selected', 'Age', 'Age_selected', 'Brain_Region', 'Brain_Region_selected',
    'Datasets', 'Datasets_selected', 'Protocols', 'Protocols_selected'])

  //console.log("  ~~~~~~~~~~~ RnaSelect page rendering! with sx fset =",getFilterSet('sex'), "  key =", sxkey)
  return (<div class="col-12 d-flex flex-nowrap flex-column">
    <Row className="pt-0 mt-0 pb-0 mb-0 justify-content-center flex-nowrap">
      <Col xs="2" className="d-flex flex-column m-0 p-0 pl-1 ml-1 colDemo align-self-stretch justify-content-center " >
        <Row className="d-flex position-relative mb-0 pb-0 pl-0 justify-content-start align-self-stretch">
          <Col xs="7" className="d-flex justify-content-start align-items-center pr-0 mr-0">
            <Button outline color="danger" className="btn-sm align-self-center" onClick={resetFilters}
              data-toggle="tooltip" title="Clear all selection filters"
              style="line-height:80%;font-size:80%">Clear</Button>
          </Col>
          <Col className="d-flex m-0 p-0 ml-1 align-self-start position-relative" style="min-height:3rem;">
            <Row className="d-flex justify-content-start align-items-center">
              <Button className="btn-sm btn-light align-self-center app-btn-help ml-4" onClick={() => setShowHelp(!showHelp)}
                data-toggle="tooltip" title="Toggle help text display">?</Button>
              {showHelp ? <div id="help-msg" class="app-help-panel align-self-center">
                Choose from every selection category below in order to export samples.<br/> 
                Click <span class="bt-apply" style="padding:0 2px;margin:2px;">Apply</span> to enact a sample selection.
              </div> : null}
            </Row>

          </Col>
        </Row>
      </Col>
      <Col className="pl-0 pt-0 mt-1 align-self-start" style="left:-6rem; max-width:26rem;min-width:26rem;">
        <div id="dset-info"><div id="dset-info-content">testing here </div></div>
      </Col>
      <Col xs="4" className="d-flex flex-fill" style="z-index:-1;" >
      </Col>
    </Row>
    <Row className="flex-grow-1 pt-0 mt-0 justify-content-center flex-nowrap">
      <Col xs="3" className="colDemo" >
        <Col className="d-flex flex-column col-vscroll"  >
          <Row className="d-flex justify-content-start">
            <FltMList key={`dx${clearCounter}_${m.updList['dx']}`} id="dx" width="15em" height="6.9em" data={dtaDx} filter={getFilterSet} onApply={applyFilter} updateFilter />
          </Row>
          <Row className="d-flex justify-content-start">
            <FltMList key={`sx${clearCounter}_${m.updList['sex']}`} id="sex" type="htoggle" width="15em" data={dtaSex} filter={getFilterSet} onApply={applyFilter} updateFilter />
          </Row>
          <AgeDualPanel key={`age${clearCounter}_${m.updList['age']}`} width="15em" onAgeSelection={onAgeSelection} />
          <Row className="d-flex justify-content-start" style="margin-top:2px;">
            <FltMList key={`race${clearCounter}_${m.updList['race']}`} id="race" width="15em" height="5.5rem" data={dtaRace} filter={getFilterSet} onApply={applyFilter} updateFilter />
          </Row>
        </Col>
      </Col>
      {/*  middle column -- protocol, datasets and regions */}
      <Col className="pt-0 mt-0 align-self-start" style="max-width:26rem">
        <Row className="mt-0 pt-0">
          <Col className="pt-0 mt-0">
            <Row className="pt-0 mt-0">
              <FltMList key={`ds${clearCounter}_${m.updList['dset']}`} id="dset" height="11em" width="25em" type="faketoggle" nocollapse class="fl-inset lg-sq"
                data={dtaDset} filter={getFilterSet} onApply={applyFilter} updateFilter onClickItem={onDatasetClick} />
            </Row>
            <Row className="d-flex justify-content-start flex-nowrap">
              <Col className="p-0 m-0" style="max-width:15.2em;">
                <FltMList key={`reg${clearCounter}_${m.updList['reg']}`} id="reg" width="14rem" height="18rem" data={dtaReg} filter={getFilterSet} onApply={applyFilter} updateFilter sort />
              </Col>
              <Col className="p-0 m-0">
                <FltMList key={`prot${clearCounter}_${m.updList['proto']}`} id="proto" type="toggle" nobars width="10.4em" data={dtaProto} filter={getFilterSet} onApply={applyFilter} updateFilter />
              </Col>
            </Row>
          </Col>
        </Row>
      </Col>
      {/* -- right column: selection summary -- */}
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