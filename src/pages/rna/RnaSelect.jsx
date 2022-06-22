/* eslint-disable no-lonely-if */
import $ from 'jquery';
import { h } from 'preact';
import {useEffect, useState, useRef, useReducer} from "preact/hooks";
import '../../comp/ui.css';
import './style.css';

import {useFltCtx, useFltCtxUpdate, useRData, getFilterData, getFilterSet, getFilterCond,
	applyFilterSet, applyFilterCond, clearFilters, dtFilters, getDatasetCitation,
  applyBrList, clearBrListFilter, getBrListFilter, anyActiveFilters} from '../../comp/RDataCtx'

import {FltMList} from '../../comp/FltMList'
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'
import {ToastBox} from '../../comp/ToastBox'
import RSelSummary from '../../comp/RSelSummary'
import AgeDualPanel from '../../comp/AgeDualPanel'

const RnaSelect = ({ style }) => {
	const [, , , dataLoaded] = useRData()
  const notifyUpdate = useFltCtxUpdate();
	const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [ clearCounter, setClearCounter ]=useState(0)
  //const [ updating, setUpdating ] = useState(false) // when dataset selection/switching is instant, disable clicking while updating

    
  //const [brloaded, setBrLoaded] = useState(0)

  useEffect( ()=>{
    $('[data-toggle="tooltip"]').tooltip({ delay:{show:800, hide:100 }, trigger : 'hover'})
    //$("body").tooltip({ selector: '[data-toggle=tooltip]' });
    $('.toast').toast({ delay: 7000 })
  }, [])

  useEffect( ()=> {
    clearDsetInfo() //every re-render should clear that
  })

  if (!dataLoaded) return <h3>Loading..</h3>

  function clearDsetInfo() {
     const dt=$('#dset-info-content')
     dt.html("");dt.hide()
  }

  function resetFilters() {
    clearDsetInfo()
    clearFilters()
    setClearCounter( clearCounter+1 )
    notifyUpdate('clear')
    //simply triggers refresh, but for some components we want to trigger remount
  }

	function applyFilter(fid) {
    clearDsetInfo()
		applyFilterSet(fid)
		notifyUpdate(fid)
	}

  function onAgeSelection(customRange) {
    notifyUpdate(customRange?'age-range':'age')
  }

  function onBrListLoad(brlist) {
    if (!brlist || brlist.length==0) {
      clearDsetInfo()
      //clearFilters()
      clearBrListFilter()
      notifyUpdate('clear-brlist')
      //setBrLoaded(0)
      return 0
    }
    const n=applyBrList(brlist)
    notifyUpdate('brlist')
    return n
  }

  function prepRefHtml(ref) {
    // ref=ref.replace(/\|/g, "<br>")
    let rl=ref.trim().split(/\|/)
    // 0 - authors | 1 - title | 2-journal | 3,4 = url:check prefixes
    if (rl[2]) if (rl[2].length<3) rl[2]=""; else rl[2]=`<i>${rl[2]}</i>`;
    for (let i=3;i<rl.length;i++) {
      let u=rl[i].split(/:/);
      if (u && u.length>1) {
         u[0]=u[0].toLowerCase()
         switch (u[0]) {
           case 'doi': u[1]=`<a href="https://doi.org/${u[1]}" target="_blank">DOI</a>`;
                      rl[2]+=`&nbsp;&nbsp;&nbsp;&nbsp;${u[1]}`;
                      break;
           case 'pmid' : u[1]=`<a href="https://pubmed.ncbi.nlm.nih.gov/${u[1]}" target="_blank">PMID</a>`;
                      rl[2]+=`&nbsp;&nbsp;&nbsp;&nbsp;${u[1]}`;
                      break;
           case 'https' : u[1]= `<a href="https:${u[1]}" target="_blank">url</a>`;
                      rl[2]+=`&nbsp;&nbsp;&nbsp;&nbsp;${u[1]}`;
                      break;
         }
      }
    }
    return `<b>${rl[1]}</b><br/>${rl[0]},&nbsp;${rl[2]}`
  }

  function onDatasetClick(dix, fid, sel) {
    let ref=getDatasetCitation(0, dix)
    const dt=$('#dset-info-content')
    const nsi=$("#no-sel-info")
    if (sel && sel.length>1) {
      //dt.html('<span class="dset-info-warn"> Warning: selecting samples from more than one dataset! </span>');
      //dt.show()
       dt.html("");
       dt.hide()
       if (nsi) nsi.show()
      $("#dsMultiWarn").toast('show')
      return
    }
    if (sel.length<=1) $("#dsMultiWarn").toast('hide');
    if (sel.length && ref && ref.length>0) {
        //hide the no-sel-info panel
        if (nsi) nsi.hide()
        const refhtml=prepRefHtml(ref)
        dt.html(refhtml);
        dt.show()
    } else {
       dt.html("");
       dt.hide()
       if (nsi) nsi.show()
    }
  }

  const dtaSex=getFilterData('sex')
	//const dtaAge=getFilterData('age')
	const dtaDx=getFilterData('dx')
	const dtaRace=getFilterData('race')
	const dtaProto=getFilterData('proto')
	const dtaDset=getFilterData('dset')
	const dtaReg=getFilterData('reg')
  const brloaded=getBrListFilter().size
  const showsel = anyActiveFilters(true); //ignore checkboxes (genotyped/seq)
  console.log("  ~~~~~~~~~~~ RnaSelect page rendering! with dtaDx=",dtaDx)
  return(<div class="col-12 d-flex flex-nowrap flex-column">
<Row className="pt-0 mt-0 pb-0 mb-0 justify-content-center flex-nowrap">
  <Col xs="3" className="d-flex-column m-0 p-0 pl-1 ml-1 colDemo justify-content-start" >
   <Row className="m-0 p-0 ml-1">
    { showsel ? <span class="red-info-text">&nbsp;</span> :
         <span class="red-info-text" style="overflow:visible;min-width:39rem;">
         &nbsp;<span id="no-sel-info" style="position:absolute;top:26px;left:64px;min-width:38rem;">
          Apply a selection in a category panel in order to limit the sample selection in that category.
         </span>
         </span> }
   </Row>
   <Row className="mb-0 pb-0 pl-3">
   <Button outline color="danger" className="btn-sm align-self-center" onClick={resetFilters}
	 	     data-toggle="tooltip" title="Clear all selection filters"
			   style="line-height:80%;font-size:80%;margin-top:6px;">Clear</Button>
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
      <FltMList key={`dx${clearCounter}`} id="dx" width="15em" height="6.9em" data={dtaDx} filter={getFilterSet} onApply={applyFilter} updateFilter />
    </Row>
    <Row className="d-flex justify-content-start">
      <FltMList key={`sx${clearCounter}`} id="sex" type="htoggle" width="15em" data={dtaSex} filter={getFilterSet} onApply={applyFilter} updateFilter />
    </Row>
    <AgeDualPanel key={`age${clearCounter}`}  width="15em" onAgeSelection={onAgeSelection} />
    <Row className="d-flex justify-content-start">
      <FltMList key={`race${clearCounter}`} id="race" width="15em" height="5.4rem" data={dtaRace} filter={getFilterSet} onApply={applyFilter} updateFilter />
    </Row>
   </Col>
  </Col>
  {/*  middle column -- protocol, datasets and regions */}
  <Col className="pt-0 mt-0 align-self-start" style="max-width:26rem">
	 <Row className="mt-0 pt-0">
			<Col className="pt-0 mt-0">
       <Row className="pt-0 mt-0">
		       <FltMList key={`ds${clearCounter}`} id="dset" height="11em" width="25em" type="faketoggle" nocollapse class="fl-inset lg-sq"
             data={dtaDset} filter={getFilterSet} onApply={applyFilter} updateFilter onClickItem={onDatasetClick} />
		   </Row>
       <Row className="d-flex justify-content-start flex-nowrap">
          <Col className="p-0 m-0" style="max-width:15.2em;">
          <FltMList key={`reg${clearCounter}`} id="reg" width="14rem" height="10.7rem" data={dtaReg} filter={getFilterSet} onApply={applyFilter} updateFilter sort />
          </Col>
         <Col className="p-0 m-0">
           <FltMList key={`prot${clearCounter}`} id="proto" type="toggle" nobars width="10.4em" data={dtaProto} filter={getFilterSet} onApply={applyFilter} updateFilter />
         </Col>
       </Row>
		  </Col>
	 </Row>
  </Col>
  {/* -- right column: selection summary -- */}
  <Col xs="4" className="d-flex flex-fill" >
		 <Row className="pt-0 mt-0 d-flex flex-fill flex-grow-1 justify-content-center align-items-start">
				 <RSelSummary brloaded={brloaded} onBrList={onBrListLoad} />
  	 </Row>
  </Col>
  <ToastBox id="dsMultiWarn" title="Warning" text="Batch effect should be considered when selecting samples from multiple datasets." />
 </Row>
 </div>)
}

export default RnaSelect;