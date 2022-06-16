import $ from 'jquery';
import {useState, useEffect} from 'preact/hooks';
import { rGlobs, useRData,  useFirstRender, br2Smp, smp2Br,
   smpBrTotals, dtBrOriCounts, dtFilters, dtaNames,  useFltCtx,
   dtaBrains, XBrs, anyActiveFilters, clearFilters,
   getBrSelData, getSelDatasets, dtBrXsel } from './RDataCtx';

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

// props.onBrList() callback being passed the brlist array
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
  const btcap=num ? "Clear BrNums" : "Upload BrNums";
  return(
  <Row className="p-1 mb-3 d-flex justify-content-start align-items-center">
    <Button id="b1" className="btn-sm app-btn" onClick={brListClick}>{btcap}</Button>&nbsp;
      {(num>0) && <span class="lg-flt">{num}</span> }
        <span style="padding:2px 2px;font-size:90%">{loaded}</span>
    <DlgBrUpload isOpen={openBrsUpDlg} toggle={toggleBrsDlg} onSubmit={getBrList}
      title="Confirm" />
  </Row>)


}
//props.onBrList
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
    return (<><Row className="d-flex flex-nowrap justify-content-between pt-4">
      <Button className="btn-light btn-sm app-btn btn-download flex-nowrap " onClick={toggleModal}>
       Download</Button>
       <DlgSaveCSV data={getBrSelData([0,1,2])} isOpen={isModalShowing}  toggle={toggleModal} />
       <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
       <Button className="btn-light btn-sm app-btn flex-nowrap ">
       Request Genotypes</Button>
   </Row></>)
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
   data.datasets=getSelDatasets()
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

  return (<Col className="pl-0 ml-0 d-flex flex-column sel-summary text-align-center justify-content-center align-items-center">

          { (!props.browse) && <LoadBrList brloaded={props.brloaded} onBrList={props.onBrList} /> }

         { (selXType==0 && !showsel && ! props.browse) && <div style="color: #777;font-size:95%;"><span>{totalBrCount} subjects in the database</span>
            {(selbrCount!==totalBrCount) &&  <span> ({selbrCount}) </span>}</div>
         }
        {/* <div style="color: #777">
          { selXType ? <>Available: <b>{smpBrTotals[selXType-1][0]}</b> samples from <b>{smpBrTotals[selXType-1][1]}</b> subjects</>
                       :  <><b>{XBrs.size}</b> sequenced brains (out of <b>{totalBrCount}</b> total)</>
                      }
        </div> */}

        <div class="red-info-text" style="line-height:200%;">
          {showsel ?<span>&nbsp;</span>:<span>Apply a selection to see subject summaries.</span> }
        </div>

        {/*  (selXType && showsel && regflt) ?  regTable()  : null */}

        {showsel && <>
          { selXType ? <Row className="pb-0 mb-0 d-flex justify-content-center" style="font-size:1rem;border-bottom:1px solid #ddd;">
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
        {/* showsel && <Row className="flex-nowrap flex-row justify-content-center" style={{paddingTop: "1em" }} > */}
        <Row className="flex-nowrap flex-row justify-content-center" style={{paddingTop: "1em" }} >
             { showDlButton ? <Col className="d-flex flex-column">

               <Row className="d-flex flex-nowrap align-items-center align-self-center justify-content-center" style={{fontSize:"1rem"}}>
                 <span class="flex-fill"> Selected samples: </span>
                       <span className="sel-total"> {numsmp ? numsmp : 0} </span>
              </Row>

              <Row className="p-2 m-2">
                    { mixprotos.length>1 && <ToastBox id="tsWarnProto" title="Warning"
                    text={`Selection has samples with ${mixprotos.length} different RNAseq protocols (${ mixprotos.join(', ')})`} />
                    }
              </Row>
              <Row className="d-flex flex-fill flex-nowrap justify-content-center">
                 <Col className="d-flex justify-content-center">
                     <Button className="btn-light btn-sm app-btn btn-download" onClick={toggleModal}>
                       Download</Button>
                    { restrictedDatasets.length ?
                      <DlgRequest datasets={restrictedDatasets} isOpen={isModalShowing} toggle={toggleModal} /> :
                      <DlgDownload isOpen={isModalShowing} toggle={toggleModal} getData={getSelSampleData} /> }
                 </Col>
                 <Col className="d-flex justify-content-center">
                    <Button className="btn-light btn-sm app-btn btn-xplore" onClick={clickExploreBtn}>Explore</Button>

                 </Col>
              </Row>
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
