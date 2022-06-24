import $ from 'jquery';
import {useState, useEffect} from 'preact/hooks';
import { rGlobs, useRData,  useFirstRender, br2Smp, smp2Br,
   smpBrTotals, dtBrOriCounts, dtFilters, dtaNames,  useFltCtx,
   dtaBrains, XBrs, anyActiveFilters, clearFilters,
   getBrSelData, getSelDatasets, dtBrXsel, getRegionCounts } from './RDataCtx';

import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
     Row, Col, Button, Label, Alert} from 'reactstrap';

import './RSelSummary.css'
import { DlgDownload } from './DlgDownload';
import { DlgRequest } from './DlgRequest';
import { DlgSaveCSV } from './DlgSaveFile';
import {ToastBox} from './ToastBox'

import { useModal } from './useModal';
import { DlgBrUpload } from './DlgBrUpload'
import { rowCSV, rowTSV }  from './gutils';
import { navigateTo, hrefTo, currentPageTab} from './header';

/*  BrList loader component:
     props.brloaded   : number of BrNums loaded
     props.onBrList() : callback being passed the brlist array
*/
function LoadBrList(props) {
  // shows a button and a info Label

  const [numbrs, setNumBrs] = useState(props.brloaded|0)
  const [openBrsUpDlg, setBrsUpDlg] = useState(false)
  function toggleBrsDlg() { setBrsUpDlg(!openBrsUpDlg)}
  function brListClick() {
    if (numbrs>0) {// Clear
         if (props.onBrList) setNumBrs(props.onBrList([]))
       }
      else //open upload dialog
       setBrsUpDlg(true)
  }

  function getBrList(brlist) { //on submit
     // do something with brlist
     if (props.onBrList) setNumBrs(props.onBrList(brlist))
      else setNumBrs(brlist.length)
  }
  let num=numbrs
  if (props.brloaded && numbrs!=props.brloaded) {
    setNumBrs(numbrs)
    num=numbrs
  }

  const loaded=num ? "subjects loaded" : "No subjects loaded.";
  const btcap=num ? "Clear BrNums" : "Load BrNums";
  return(
  <Row className="p-1 mb-1 d-flex justify-content-start align-items-center">
    <Button id="b1" className="btn-sm app-btn" onClick={brListClick}  data-toggle="tooltip" title="Limit selection to a list of Br#s">{btcap}</Button>&nbsp;
      {(num>0) && <span class="lg-flt">{num}</span> }
        <span style="padding:2px 2px;font-size:90%">{loaded}</span>
    <DlgBrUpload isOpen={openBrsUpDlg} toggle={toggleBrsDlg} onSubmit={getBrList}
      title="Confirm" />
  </Row>)
}

/* main RSelSummary multi-panel component
   props.browse : bool flag indicator of the Browse tab context
   props.brloaded : passed on to LoadBrList component 
   props.onBrList : passed on to LoadBrList component 
   props.selsheet : passed down from RnaSelect page to DlgDownload dialog
*/
function RSelSummary( props ) {
  // props.onBrList() handler
  // props.brloaded can receive back the updated brlist count
  const [fltUpdId, fltFlip] = useFltCtx(); //external update, should update these counts
  const [xdata, countData, brCounts] = useRData(); //dtXsel, dtCounts, dtBrCounts

  const [isModalShowing, toggleModal] = useModal();
  const selXType = rGlobs.selXType;

  const xt=selXType ? selXType-1 : 0;
  const regflt=(dtFilters.reg.size>0)
  let dsflt=dtFilters.dset; //only used for RNASeq downloading for now
  let showsel = anyActiveFilters(true); //ignore checkboxes (genotyped/seq)
  //let showsel = true;
  let showDlButton=(selXType && dsflt.size>0); //only set for RNAseq - must have a dataset selected!
  const mixprotos = [];
  const selDsInfo=getSelDatasets()
  const selDatasets=[]
  if (selDsInfo && selDsInfo.length) {
     selDsInfo.forEach( (ds)=>{
        if (ds[1]>0) selDatasets.push(ds)
     })
  }
  if (showsel)  {
    for (let i=1;i<countData.proto.length;i++)
       if (countData.proto[i]>0) mixprotos.push(dtaNames.proto[xt][i]);
 }

 function brSaveSection() {
    //prepare the blob data here
    //const obj = {hello: 'world'};
    //const blob = new Blob([JSON.stringify(obj, null, 2)], {type : 'application/json'});
    //let blob = "Just a stupidly long text data here?\nHello\n";
    /*
     <Button onClick={downloadCSV}>Download CSV</Button>
       <div style="width:3rem" />
     <Button onClick={downloadCSV}>Import list</Button>
    */
    return (<Row className="d-flex flex-nowrap justify-content-between pt-4">
      <Button className="btn-light btn-sm app-btn btn-download flex-nowrap " onClick={toggleModal}>
       Download</Button>
       <DlgSaveCSV data={getBrSelData([0,1,2])} isOpen={isModalShowing}  toggle={toggleModal} />
       <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
       <Button className="btn-light btn-sm app-btn flex-nowrap ">
       Request Genotypes</Button>
     </Row>)
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
useEffect( ()=> {
  if (mixprotos.length>1)  {
    $("#tsWarnProto").toast('show')
  }
})

  if (!smpBrTotals || smpBrTotals.length==0) return null;

  const numsmp = selXType ? xdata[xt].length : 0 ; //dtXsel.length;
  //console.log("------------ HERE: ", brCountData.sex.splice(1))
  const numbr=brCounts.sex.slice(1).reduce((a, b)=>a+b)
  //const numbr=brCountData.sex[1]+brCountData.sex[2]
  //console.log("================= dtBrXsel.size: ", dtBrXsel.size, " | numbr=", numbr)
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
  function subjTable() {
    return(<>
      <Col><table className="subjtbl" ><tbody>
      { brCounts.dx.map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}>
              <td align="right"> {e} </td> <td align="left">{ dtaNames.dx[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      <Col><table className="subjtbl" ><tbody>
      { brCounts.race.map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}>
              <td align="right"> {e} </td> <td align="left">{ dtaNames.race[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      <Col><table className="subjtbl" ><tbody>
      { brCounts.sex.map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}>
              <td align="right"> {e} </td> <td align="left">{ dtaNames.sex[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      </>)
  }

  function arrayEq(a, b) {
    if (a.length!==b.length) return false
    for (let i=0;i<a.length;i++)
        if (a[i]!==b[i]) return false
    return true
  }

  function subjXTable() {
     //cross tab functionality
     //TODO: can also build CSV (users might want to save this too!)
     if (brCounts.cxDxRace.length<2) {
       //console.log(" -- cxDxRace:", brCounts.cxDxRace);
       return subjTable();
     }
     const dxr=brCounts.cxDxRace
     const c2dx=brCounts.cx2dx
     const dxs=brCounts.cxDxSex
     const c2s=brCounts.cx2s
     const c2r=brCounts.cx2r
     let csums=[], rsums=[], scsums=[] //, csum=[]
     //-- sorting this table to match the regular Dx, Race order in the data
     let ris=dxr.map((e,i)=>i) // for race
     let sris=dxs.map((e,i)=>i) // for sex
     if (!arrayEq(ris, sris)) {
       console.log(" !!!!!!!!!! Error: subjXTable Dx rows should be the same!")
       return subjTable();
     }
     let cis=dxr[0].map((e,i)=>i) // for race
     let scis=dxs[0].map((e,i)=>i) // for sex
     ris.sort( (a,b)=> c2dx[a]-c2dx[b])
     cis.sort( (a,b)=> c2r[a]- c2r[b])
     let dxrSrt=ris.map( (e,i)=>dxr[e] )
     for (let r=0;r<dxrSrt.length;r++) {
         rsums.push(0)//rsums[r]=0
         dxrSrt[r]=cis.map( (e,i)=> {
           const c=dxrSrt[r][e]
           rsums[r]+=c
           if (r===0) csums.push(0)
           csums[i]+=c
           return(c)
          } )
     }
     // same as for race, re-sort and compute sums for sex columns
     let dxsSrt=sris.map( (e,i)=>dxs[e] )
     for (let r=0;r<dxsSrt.length;r++) {
         // rsums.push(0) -- should be the same
         dxsSrt[r]=scis.map( (e,i)=> {
           const c=dxsSrt[r][e]
           //rsums[r]+=c
           if (r===0) scsums.push(0)
           scsums[i]+=c
           return(c)
          } )
     }
     return (<Col className="pt-2"><table className="subjxtbl">
       <thead>
         <tr><td class="td-blank totals" colspan="2">TOTALS</td> {/* <td class="td-blank">  </td> */}
            {csums.map( (v,i)=> <th key={i}>{v}</th>)}
            {/*  bind the sex column totals the same way */}
            <td class="tc-spacer"> </td>
            {scsums.map( (v,i)=> <th key={i}>{v}</th>)}
         </tr>
         <tr><td class="td-blank">  </td > <td class="td-blank">  </td>
            {dxrSrt[0].map((di,i)=>{
               return <th key={i}>{dtaNames.race[c2r[cis[i]]]}</th>
             })}
            {/*  bind the sex column headers the same way */}
            <td class="tc-spacer"> </td>
            {dxsSrt[0].map((di,i)=>{
               return <th key={i}>{dtaNames.sex[c2s[scis[i]]]}</th>
             })}
          </tr>
       </thead>
       <tbody>
       {dxrSrt.map( (rd,i)=>{
            //let rsum=0
            return(<tr key={i}>
              <th>{rsums[i]}</th>
              <th>{dtaNames.dx[c2dx[ris[i]]]}</th>

              {rd.map((c,j) => <td key={j}>{c}</td> )}
              <td class="tc-spacer"> </td>
              {/*  bind the sex columns similarly - but with srd as dxsSrt[i] */}
              {dxsSrt[i].map((c,j) => <td key={j}>{c}</td> )}
            </tr>)
           })}
         {/* <tr><th> </th><th> </th>
          { csum.map( (v,k) => (<td class="tdlast" key={k}>{v}</td>)) }
          <td class="tdlast"> </td>
          </tr> */}
       </tbody></table></Col>)
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

  function clickExploreBtn() {
    const [page, tab]=currentPageTab()
    //tab can be undefined for default/entry page
    //console.log("----}} ExploreBtnClick: ", page, tab)
    navigateTo('rna', 'exp')
  }

  //console.log("----}} RSelSummary render..", dtBrXsel.size)

  const totalBrCount = dtBrOriCounts.sex[0].reduce((a, b)=>a+b)
  const selbrCount=dtBrXsel.size
  const selDslabel = (selDatasets.length>0) ? (selDatasets.length>1 ? 'Datasets' : 'Dataset') : '';
  const nRegions=showDlButton ? getRegionCounts() : []

  const regLabel=nRegions.length>1 ? 'Brain regions' : 'Brain region'
  return (<Col className="pl-0 ml-0 mt-0 pt-0 d-flex flex-column sel-summary text-align-center justify-content-center align-items-center">

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

        {showsel && <>
          { selXType ? <Row className="pb-0 mb-0 d-flex justify-content-center" style="font-size:1rem;">
                     <span style="color:#923"><b>{showsel ? numbr : 0}</b></span> &nbsp; subjects
                     </Row> :
                     <Row className="d-flex flex-nowrap align-items-center align-self-center justify-content-center"
                        style="font-size:1rem;border-bottom:1px solid #ddd;">
                     <span class="flex-fill"> Selected subjects:&nbsp; </span>
                       <span style="color:#923;padding:0 2px;padding-right:4px;"><b>{showsel ? numbr : 0}</b></span>
                     </Row> }
        <Row className="flex-nowrap align-self-center pt-0 mt-0">
          { subjXTable() }
        </Row> </>}
        {/* Row: border-top:1px solid #ddd; */}
        <Row className="d-flex-row justify-content-center mt-2 pt-1 w-100">
             { showDlButton ? <Col className="d-flex flex-column">
             <Col className="w-100 mt-0 pt-0">
              <Row className="w-auto ml-4 mr-4 justify-content-center mt-1 mb-2"
                    style="padding-top:4px;border-top:1px solid #ddd;font-size:1rem">
                       <span><span style="color:#923"> <b>{numsmp ? numsmp : 0}</b></span>
                             <span> &nbsp;samples </span>
                       </span>
              </Row>
              <Row className="d-flex justify-content-center m-0">
                <Row className="d-flex justify-content-center w-100 flex-nowrap" >
                   {/* <Col className="d-flex flex-nowrap align-self-center justify-content-end bblue"> */}
                   <Col className="col-auto">
                     <span>{selDslabel}:</span>
                   </Col>
                   {/* <Col className="d-flex-row justify-content-start"> */}
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
            <Row className="d-flex flex-nowrap justify-content-center mt-3">
                 <Col className="col-auto mr-3">
                     <Button className="btn-light btn-sm app-btn btn-download" onClick={toggleModal}>
                       Export</Button> 
                    { restrictedDatasets.length ?
                      <DlgRequest datasets={restrictedDatasets} isOpen={isModalShowing} toggle={toggleModal} /> :
                      <DlgDownload isOpen={isModalShowing} toggle={toggleModal} getData={getSelSampleData} selsheet={props.selsheet} /> }
                 </Col>
                 <Col className="col-auto ml-3">
                    <Button className="btn-light btn-sm app-btn btn-xplore" onClick={clickExploreBtn}>Explore</Button>

                 </Col>
            </Row>
            { mixprotos.length>1 && <ToastBox id="tsWarnProto" title="Warning"
                   text={`Selection has samples with ${mixprotos.length} different RNAseq protocols (${ mixprotos.join(', ')})`} />
            }
          </Col> : <Col> {selXType ? <div className="mx-auto">
                          <span class="red-info-text"> Apply a dataset selection to access samples. </span>
                       </div> : <> { showsel && brSaveSection()} </>

                       }
                   </Col>
          }
       </Row>
     </Col>
  )
}

export default RSelSummary
