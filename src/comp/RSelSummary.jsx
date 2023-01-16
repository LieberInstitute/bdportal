import $ from 'jquery';
import {useState, useEffect, useRef} from 'preact/hooks';
import { rGlobs, useRData,  useFirstRender, br2Smp, smp2Br,
   smpBrTotals, dtBrOriCounts, dtFilters, dtaNames,  useFltCtx,
   dtaBrains, anyActiveFilters, getFilterSet, useLoginCtx, reqGenotypes,
   getBrSelData, getSelDatasets, dtBrXsel, getRegionCounts, getSelSampleData,
   arrayEq, subjTable, subjXTable, updateBrCountsFromBrSet } from './RDataCtx';

import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
     Row, Col, Button, Label, Alert} from 'reactstrap';

import './RSelSummary.css'
import { DlgDownload } from './DlgDownload';
import { DlgRequest } from './DlgRequest';
import { DlgSaveCSV } from './DlgSaveTable';
import { DlgReqGeno } from './DlgReqGeno';
import {ToastBox} from './ToastBox'

import { useModal } from './useModal';
import { DlgBrUpload } from './DlgBrUpload'
import { rowCSV, rowTSV }  from './gutils';
import { navigateTo, hrefTo, currentPageTab} from './header';

import { clearTooltips, setupTooltips } from './ui';

/*  BrList loader component:
     props.brloaded   : number of BrNums loaded
     props.onBrList() : callback being passed the brlist array
*/

const plzlog = "Login to enable this button"


function BrSetButtons({ numbr, show, browse, brSet, getBrowseTable, login } ) {

  const [isFullBrSave, toggleFullBrSave]=useModal()
  const [isReqGeno, toggleReqGeno]=useModal()
  function clickBrBrowseButton() {
    navigateTo('brsel', 'browse')
  }

  const refData=useRef({ lastgtReqSet: 0 }) //just the total guarding for now
  const m=refData.current

  function getBrCount() {
    const brset=brSet?brSet:dtBrXsel;
    return brset.size;
  }

  function getBrNumSet() {
    const brset=brSet?brSet:dtBrXsel
    const barr=[]
    brset.forEach( brix => {
       const [brint, ...rest]=dtaBrains[brix]
       barr.push(`Br${brint}`)
    })
    return barr
  }

  //useEffect( ()=> {
  //  if (login.length>0)
  //     $('#btnGtReq').prop("disabled",false);
  //})

  if (!show || numbr<1) return null;
  // style={ browse ? null : { display: "none" } }

  // data={getBrSelData([0,1,2], brSet)}

  function submitGenoRequest() {
    //console.log("submit request with brlist=", brarr)
      //$('#btnGtReq').prop("disabled",true);
      const brarr=getBrNumSet()
      m.lastgtReqSet=brarr.length
      reqGenotypes(brarr).then( (t)=>{
           console.log(" reqGenotypes() task started:", t)
         });
    //logAction('req_geno', [4,3,1,2], brarr.join(','))
    //mwMail("geo.pertea@gmail.com", "here get the list", brarr.slice(0,4))
    return true;
  }


  const reqgenotip = login.length==0 ? plzlog : "Request genotype data for current selection";
  const exporttip = login.length==0 ? plzlog : "Export CSV table with selected brains info";
  const reqGenoDisable=(login.length==0 || m.lastgtReqSet===numbr)
  //console.log("~~~ rendering buttons with numbr", numbr, "   lastnumbr", m.lastgtReqSet)
  return (<Col>
   <Row id="brsetbtns" className="d-flex flex-nowrap align-items-center justify-content-between mt-2">
    <Col className="col-auto m-0">
          <Button className="btn-light btn-sm app-btn" onClick={clickBrBrowseButton} style={ !browse ? null : { display: "none" } }
                   data-toggle="tooltip" title="Browse and save the selected brain set">
            Browse Set</Button>

     </Col>
     <Col className="col-auto m-0">
     <Button className="btn-light btn-sm app-btn" disabled={login.length==0} onClick={toggleFullBrSave}
                    data-toggle="tooltip" data-placement="bottom" title={`${exporttip}`}>Export Set</Button>
     </Col>
     { browse ? <DlgSaveCSV getData={getBrowseTable} isOpen={isFullBrSave} fname={`brain_set_n${numbr}`} toggle={toggleFullBrSave} />
              : <DlgSaveCSV data={getBrSelData([0,1,2,3], brSet)} isOpen={isFullBrSave} fname={`brain_set_n${numbr}`} toggle={toggleFullBrSave} />
     }
     <Col className="col-auto m-0">
        <Button id="btnGtReq" className="btn-light btn-sm app-btn" disabled={reqGenoDisable} onClick={toggleReqGeno}
           data-toggle="tooltip" title={`${reqgenotip}`} >Request Genotypes</Button>
     </Col>
     <DlgReqGeno getData={getBrCount}  email={`${login}@libd.org`} onSubmit={submitGenoRequest} isOpen={isReqGeno} toggle={toggleReqGeno} />
   </Row>
   <Row className="d-flex justify-content-center mt-2">
     { browse ?  <span class="red-info-text br-set-info"> &nbsp; </span>
       : <span class="red-info-text br-set-info">
        Inspect/save the selection set using the Browse button, or navigate to the
        experiment data page using the top-left menu.<br /><br />
        When navigating away from this page, only demographics selections and the
        user loaded Br# list will be carried over.
       </span>
    }
   </Row>
   </Col>)
}


function LoadBrList(props) {
  // shows a button and a info Label

  //const [numbrs, setNumBrs] = useState(props.brloaded|0)
  const refData=useRef({ numbrs: 0 })
  const m=refData.current
  const [openBrsUpDlg, setBrsUpDlg] = useState(false)
  function toggleBrsDlg() { setBrsUpDlg(!openBrsUpDlg)}
  function brListClick() {
    if (m.numbrs>0) {// Clear
         if (props.onBrList) //setNumBrs(props.onBrList([]))
            m.numbrs=props.onBrList([])
       }
      else //open upload dialog
         setBrsUpDlg(true)
  }

  function getBrList(brlist) { //on submit
     // do something with brlist
      if (props.onBrList) //setNumBrs(props.onBrList(brlist))
                   m.numbrs=props.onBrList(brlist)
      else m.numbrs=brlist.length //setNumBrs(brlist.length)
  }

  if (typeof props.brloaded!=='undefined' && m.numbrs!=props.brloaded) {
    //setNumBrs(numbrs)
    m.numbrs=props.brloaded
  }
  let num=m.numbrs
  const loaded=num ? "brains loaded" : "No brain list set.";
  const btcap=num ? "Clear Br# list" : "Load Br# list";
  const btooltip = num ? "" : "Provide a file or a list of Br#s";
  //console.log(` rendering LoadBrList() with num=${num}, props.brloaded=${props.brloaded}`)
  return(
  <Row className="pt-2 mt-2 mb-2 pb-1 d-flex justify-content-start align-items-center">
    <Col id="brlist-col" className="d-flex flex-column justify-content-center align-items-center position-relative">
    <div class="row d-flex justify-content-center align-items-center">
      <Button id="b1" className="btn-sm app-btn" style="font-size:90% !important;line-height:80% !important;"
         onClick={brListClick}>{btcap}</Button>&nbsp;
         {(num>0) && <span class="lg-flt">{num}</span> }
          <span style="padding:2px 2px;font-size:90%">{loaded}</span>
      <DlgBrUpload isOpen={openBrsUpDlg} toggle={toggleBrsDlg} onSubmit={getBrList}
           title="Confirm" />
    </div>
    <div class="row brlist-info d-flex justify-content-center">
        { (num>0) ? <span> Clear the user provided list of brains </span>
           : <span>
              Loading a list of brains will clear the existing selections<br />
            </span>}
   </div>
    </Col>
  </Row>)

}

/* main RSelSummary multi-panel component
   props.browse : bool flag indicator of the Browse tab context
   props.brloaded : passed on to LoadBrList component
   props.onBrList : passed on to LoadBrList component
   props.selsheet : passed down from RnaSelect page to DlgDownload dialog
*/
function RSelSummary( props ) {
  // props.brSet -> if provided, should reinitialize dtBrCounts.*2* hashes with updateBrCountsFromBrSet()
  // props.onBrList() handler
  // props.brloaded can receive back the updated brlist count
  const [fltUpdId, fltFlip] = useFltCtx(); //external update, should update these counts
  const [login, loginJWT] = useLoginCtx();
  const [xdata, countData, brCounts] = useRData(); //dtXsel, dtCounts, dtBrCounts

  const [isDlgExport, toggleDlgExport] = useModal(); //for full Export dialog
  const [dlgSaveBrSum, toggleSaveBrSum] = useModal(); //for saving subject summary table
  const selXType = rGlobs.selXType;

  const refData=useRef( {
    firstRender:true,
    selSheet:null,
    brSummary:null
  })
  const m=refData.current;

  const xt=selXType ? selXType-1 : 0;
  if (m.firstRender) {
    m.firstRender=false;
    if (!props.browse && brCounts.act_brSet && brCounts.act_brSet!=dtBrXsel)
       updateBrCountsFromBrSet() //coming back from Browse tab to the Select tab in BSB
  }

  const brSet = props.brSet ? props.brSet : dtBrXsel ;
  //console.log("props.brSet:", props.brSet);
  //console.log( "dtBrXsel:", dtBrXsel);

  let dsflt=dtFilters.dset; //only used for RNASeq downloading for now
  let showsel = anyActiveFilters(true); //ignore checkboxes (genotyped/seq), depends also on selXtype
  //let showsel = true;
  let showDlButton=(selXType && dsflt.size>0); //only set for RNAseq - must have a dataset selected!
  const mixprotos = [];
  const selDsInfo=getSelDatasets()
  const selDatasets=[]

  const numsmp = selXType ? xdata[xt].length : 0 ; //dtXsel.length;

  const numbr=brCounts.sex.slice(1).reduce((a, b)=>a+b)
  const havebr=(numbr>0);

  if (selDsInfo && selDsInfo.length) {
     selDsInfo.forEach( (ds)=>{
        if (ds[1]>0) selDatasets.push(ds)
     })
  }
  if (showsel)  {
    const protoset=getFilterSet('proto')
    for (let i=1;i<countData.proto.length;i++)
       if (protoset.has(i) && countData.proto[i]>0) mixprotos.push(dtaNames.proto[xt][i]);
 }

   /*
   useEffect( () =>  {
      function jqBuildTable() {
      }
     //if (isFirstRender) return;
     //-- no need to update if the update was due to self
     //if (fid===fltUpdId) return; //self-inflicted update, don't change the counts?
     jqBuildTable();  //update counts only
  }, [fltUpdId, fltFlip] );
*/

  useEffect(() => {
    setupTooltips()
    $('.toast').toast({ delay: 7000 })
    return ()=>{ //clean-up code
       clearTooltips()
    }
  }, [showsel, havebr, login])

  useEffect( ()=> {
    if (mixprotos.length>1)  {
      $("#tsWarnProto").toast('show')
    }
  })

  if (!smpBrTotals || smpBrTotals.length==0) return null;

  //const numbr=brCountData.sex[1]+brCountData.sex[2]
  let restrictedDatasets=[] //gather restricted datasets
  if (selXType)
    dsflt.forEach( (di)=>{
       if (dtaNames.dsetp[xt][di]===1)
           restrictedDatasets.push(dtaNames.dset[xt][di]);
    } )



  /*
  const saveFile = async (fname, blob) => {
        const a = document.createElement('a');
        a.download = fname;
        a.href = URL.createObjectURL(blob);
        a.addEventListener('click', (e) => {
          setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000);
        });
        a.click();
   };

  function downloadCSV() {
      const obj = {hello: 'world'};
      const blob = new Blob([JSON.stringify(obj, null, 2)], {type : 'application/json'});
      saveFile('Br_list.csv', blob);
    }
  */

  function arrayEq(a, b) {
    if (a.length!==b.length) return false
    for (let i=0;i<a.length;i++)
        if (a[i]!==b[i]) return false
    return true
  }

  function regTable() {
    return( <Row className="flex-nowrap justify-content-center p-1">
    <Col className="v100" style="color:#888">
      Regions:
    </Col>
    <Col>
      <table className="subjtbl" ><tbody>
      { countData.reg[xt].map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}>
              <td align="right"> {e} </td> <td align="left">{ dtaNames.reg[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      </Row>)

  }
  /*
  function getSelSampleData() { // return { datasets: [], samples: []}
   const data={ }
   const dsinfo=getSelDatasets()
   data.datasets=[]
   dsinfo.forEach( dsd => {
      if (dsd[1]>0) data.datasets.push(dsd[0])
    })
   const sampleIDs=[]
   const xt=0 //RNAseq data type, rGlobs.selXType-1
   xdata[xt].forEach( (r,i)=>{
     sampleIDs.push(r[1]) //  [ br_idx, sample_id, ds_idx, reg_idx, proto ]
   })
   data.samples=sampleIDs
   return data
  }
  */
  function table2array(tid) {
    const tbl=document.getElementById(tid)
    const ret=[] //returning array of rows
    if (!tbl) return ret
    const rows=tbl.getElementsByTagName('tr')
    if (!rows || rows.length==0) return ret
    for (let i=0;i<rows.length;i++) {
      const cells=rows[i].querySelectorAll('td,th')
      const csvrow=[]
      cells.forEach( td => {
          csvrow.push(td.innerText);
          if (td.colSpan>1) {
            for (let f=1;f<td.colSpan;f++) csvrow.push(' ');
          }
        })
      ret.push(csvrow)
    }
    return ret
  }


  //console.log(" subjSummary array :", arr)


  function clickExploreBtn() {
    const [page, tab]=currentPageTab()
    //tab can be undefined for default/entry page
    //console.log("----}} ExploreBtnClick: ", page, tab)
    navigateTo('rna', 'exp')
  }

  function showSampleSelWarn() {
     return (<div className="mx-auto">
        <span class="red-info-warn">&#9888; </span>
        <span class="red-info-text">
          Apply a selection in every panel.
        </span>
     </div>)
  }

  function clickSaveBrSum() {
    m.brSummary=table2array('subjSummary')
    toggleSaveBrSum()
  }

  function clickDlgExport() {
    m.brSummary=table2array('subjSummary')
    toggleDlgExport()
  }

  function getBrSummary() {
    return m.brSummary
  }


  const totalBrCount = dtBrOriCounts.sex[0].reduce((a, b)=>a+b)
  const selbrCount = brSet.size
  const selDslabel = (selDatasets.length>0) ? (selDatasets.length>1 ? 'Datasets' : 'Dataset') : '';
  const nRegions=showDlButton ? getRegionCounts() : []
  //const regLabel=nRegions.length>1 ? 'Brain regions' : 'Brain region'
  //console.log("----}} RSelSummary render with login:", login, " selBrCount ", selbrCount);
  const exporttip = login.length==0 ? plzlog : "Export CSV table with selected brains info";
  const rexporttip = login.length==0 ? plzlog : "Export expression data for selected samples";
  return (
  <Col className="pl-0 ml-0 mt-0 pt-0 d-flex flex-column sel-summary text-align-center justify-content-center align-items-center">

          { (!props.browse) && <LoadBrList brloaded={props.brloaded} onBrList={props.onBrList} /> }

         { (selXType==0 && !showsel && ! props.browse) && <div style="color: #777;font-size:95%;"><span>{totalBrCount} subjects in the database</span>
            {(selbrCount!==totalBrCount) &&  <span> ({selbrCount}) </span>}</div>
         }
        {/* <div style="color: #777">
          { selXType ? <>Available: <b>{smpBrTotals[selXType-1][0]}</b> samples from <b>{smpBrTotals[selXType-1][1]}</b> subjects</>
                       :  <><b>{XBrs.size}</b> sequenced brains (out of <b>{totalBrCount}</b> total)</>
                      }
        </div> */}
        { (!showsel) &&
           <div class="red-info-text">
              <span style="line-height:200%;">Apply a selection to see subject summaries.</span>
           </div>
        }

        {/*  (selXType && showsel && regflt) ?  regTable()  : null */}

       { showsel && <>
             <Row className="pb-0 mb-0 d-flex justify-content-center" style="font-size:1rem;">
                 <span style="color:#923"><b>{showsel ? numbr : 0}</b></span> &nbsp; subjects
             </Row>
             {/* <Row className="d-flex flex-nowrap align-items-center align-self-center justify-content-center"
                          style="font-size:1rem;border-bottom:1px solid #ddd;">
                      <span class="flex-fill"> Selected subjects:&nbsp; </span>
                        <span style="color:#923;padding:0 2px;padding-right:4px;"><b>{showsel ? numbr : 0}</b></span>
            </Row> */}
            <Row className="flex-nowrap align-self-center pt-0 mt-0">
              { subjXTable(numbr) }
            </Row>
              {(numbr>0) && <Row className="pt-2">  <Button className="btn-sm app-btn" style="font-size:90% !important;line-height:80% !important;"
                  data-toggle="tooltip" title="Download CSV with the above subject summary" onClick={clickSaveBrSum}>Export totals</Button>
              <DlgSaveCSV title="Export subject summary table" getData={getBrSummary} fname={`subject_summary_n${numbr}`}
                                             isOpen={dlgSaveBrSum}  toggle={toggleSaveBrSum} />
              </Row>}
        </> }
        {/* Row: border-top:1px solid #ddd; */}
        { (selXType>0 && mixprotos.length>0) && <ToastBox id="tsWarnProto" title="Warning"
                text={`Selection has samples with ${mixprotos.length} different RNAseq protocols (${ mixprotos.join(', ')})`} />
            }
        <Row className="d-flex-row justify-content-center mt-2 pt-1 w-100">
             { (showDlButton && numbr>0) ? <Col className="d-flex flex-column">
             <Col className="w-100 mt-0 pt-0">
              <Row className="w-auto ml-4 mr-4 justify-content-center mt-1 mb-2"
                    style="padding-top:4px;border-top:1px solid #ddd;font-size:1rem">
                       <span><span style="color:#923"> <b>{numsmp ? numsmp : 0}</b></span>
                             <span> &nbsp;samples </span>
                       </span>
              </Row>
              <Row className="d-flex justify-content-center m-0">
                <Row className="d-flex justify-content-center w-100 flex-nowrap" >
                   <Col className="col-auto">
                     <span>{selDslabel}:</span>
                   </Col>
                   <Col className="col-auto">
                     {selDatasets.map( (ds, i) =>
                      <Row key={i}><b>{ds[0]}</b>&nbsp;({ds[1]})</Row>
                    )}
                  </Col>
               </Row>
               <Row className="d-flex flex-row justify-content-center w-100 flex-nowrap">
                   {/*<Col className="d-flex-column flex-nowrap align-self-center justify-content-end bgreen"
                      style="font-size: 0.95rem">
                    <span style="white-space: nowrap;">{regLabel}:</span>
                    </Col>*/}
                   <Col className="mt-1" style="font-size: 0.9rem;text-align:center;">
                      {nRegions.map( (r, i) =>
                    <span key={i}>{i>0 && <span>, </span>}{r[0]}&nbsp;({r[1]})</span>
                    )}
                  </Col>
               </Row>
             </Row>
            </Col>
            { props.selsheet ?
              <Row className="d-flex flex-nowrap justify-content-center mt-3">
                 <Col className="col-auto mr-3">
                     <Button className="btn-light btn-sm app-btn btn-download" disabled={login.length==0} title={`${rexporttip}`} onClick={clickDlgExport}>
                       Export</Button>
                    { restrictedDatasets.length ?
                         <DlgRequest datasets={restrictedDatasets} isOpen={isDlgExport} toggle={toggleDlgExport} />
                       : <DlgDownload isOpen={isDlgExport} toggle={toggleDlgExport} getData={getSelSampleData} selsheet={props.selsheet}
                                     getBrSum={getBrSummary} /> }
                 </Col>
                 <Col className="col-auto ml-3">
                    <Button className="btn-light btn-sm app-btn btn-xplore" onClick={clickExploreBtn}>Explore</Button>
                 </Col>
            </Row> : showSampleSelWarn() }

            </Col> : <Col>
                   {selXType ? showSampleSelWarn()
                           : <BrSetButtons numbr={numbr} show={showsel} browse={props.browse} login={login}
                              getBrowseTable={props.getBrowseTable} brSet={props.brSet} />

                       }
                   </Col>
          }
       </Row>
     </Col>
  )
}

export default RSelSummary
