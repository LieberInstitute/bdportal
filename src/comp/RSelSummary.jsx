import {useState, useEffect} from 'preact/hooks';
import { rGlobs, useRData,  useFirstRender, br2Smp, smp2Br,
   smpBrTotals, dtBrStats, dtFilters, dtaNames, dtXall, useFltCtx, 
   dtaBrains, XBrs, anyActiveFilters, clearFilters,
   getBrSelData} from './RDataCtx';

import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown, 
     Row, Col, Button, Label, Alert} from 'reactstrap';

import './RSelSummary.css'
import { DlgDownload } from './DlgDownload';
import { DlgRequest } from './DlgRequest';
import { DlgSaveFile } from './DlgSaveFile';

import { useModal } from './useModal';

import { rowCSV, rowTSV }  from './gutils';

const WarnProto = ( { prlist, vis }) => {
   const [visible, setVisible] = useState(true);   
    //console.log(`rendering WarnProto.. vis=${vis}, visible=${visible}`)

    function onDismiss() { setVisible(false) }
    return (
    <Alert color="danger" isOpen={visible} toggle={ onDismiss } style="font-size:90%">
      Warning: the selection has samples with&nbsp; 
             {prlist.length} different RNAseq library protocols ({ prlist.join(', ') })    
    </Alert>
  );
}

function RSelSummary() {
  const [fltUpdId, fltFlip] = useFltCtx(); //external update, should update these counts
  const [xdata, countData, brCountData] = useRData(); //dtXsel, dtCounts, dtBrCounts
  
  const {isModalShowing, toggleModal} = useModal();
  const selXType = rGlobs.selXType;

  const xt=selXType ? selXType-1 : 0;
  const regflt=(dtFilters.reg.size>0)
  let dsflt=dtFilters.dset; //only used for RNASeq downloading for now
  let showsel = anyActiveFilters();
  let showDlButton=(selXType && dsflt.size>0); //must have a dataset selected!
  
  
  function getSaveData() {
     let fdata=""
     const rows=getBrSelData([0,1])
     rows.forEach( row => fdata+=rowTSV(row) )
     return fdata
  }

  function brSaveDialog() {
    //prepare the blob data here
    //const obj = {hello: 'world'};
    //const blob = new Blob([JSON.stringify(obj, null, 2)], {type : 'application/json'});
    //let blob = "Just a stupidly long text data here?\nHello\n";

    /*
     <Button onClick={downloadCSV}>Download CSV</Button>
       <div style="width:3rem" />
     <Button onClick={downloadCSV}>Import list</Button>

    */
    return (<Row class="d-flex w-100 flex-nowrap justify-content-center">
    <Button class="btn-light checkout-btn btn-download" onClick={toggleModal}>
    <b>Download TSV</b></Button>
     <DlgSaveFile fdata={getSaveData} fext="tsv" isShowing={isModalShowing}  hide={toggleModal} />      
   </Row>)
  }

   useEffect( () =>  {
      function jqBuildTable() { 
    }
  
     //if (isFirstRender) return;
     //-- no need to update if the update was due to self
     //if (fid===fltUpdId) return; //self-inflicted update, don't change the counts?
     jqBuildTable();  //update counts only  
  }, [fltUpdId, fltFlip] );

  let mixprotos = [];

  if (showsel)  {
     for (let i=1;i<countData.proto.length;i++) 
        if (countData.proto[i]>0) mixprotos.push(dtaNames.proto[i]);
  }
  if (!smpBrTotals || smpBrTotals.length==0) return null;
   
  const numsmp = selXType? xdata[xt].length : 0 ; //dtXsel.length;
  const numbr=brCountData.sex[1]+brCountData.sex[2]; //selected brains
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
      <Col><table class="subjtbl" ><tbody>
      { brCountData.dx[xt].map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}> 
              <td align="right"> {e} </td> <td align="left">{ dtaNames.dx[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      <Col><table class="subjtbl" ><tbody>
      { brCountData.race.map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}> 
              <td align="right"> {e} </td> <td align="left">{ dtaNames.race[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      <Col><table class="subjtbl" ><tbody>
      { brCountData.sex.map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}> 
              <td align="right"> {e} </td> <td align="left">{ dtaNames.sex[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      </>)   
  }
  
  function regTable() {    
    return( <Row class="flex-nowrap justify-content-center p-1">
    <Col class="v100" style="color:#888">
      Regions:
    </Col>
    <Col>
      <table class="subjtbl" ><tbody>
      { countData.reg[xt].map(  (e,i) => {
           if (i>0 && e>0) return (<tr key={i}> 
              <td align="right"> {e} </td> <td align="left">{ dtaNames.reg[i] } </td>
      </tr>) } ) }
      </tbody></table>
      </Col>
      </Row>)
      
  }

  return (<Col class="mx-auto sel-summary">
        <div style="color: #777">
          { selXType ? <>Available: <b>{smpBrTotals[selXType-1][0]}</b> samples from <b>{smpBrTotals[selXType-1][1]}</b> subjects</>
                       :  <><b>{XBrs.size}</b> sequenced brains (out of <b>{dtaBrains.length}</b> total)</>
                      }  
         </div>

        <div style="font-size:0.8rem;color:red;line-height:200%;"> 
          {showsel ?<span>&nbsp;</span>:<span>Please apply a selection. </span> }
        </div>
        
        <span style={{fontSize:"1rem"}}>
          Selected {selXType ?  <span> samples: </span> : <span>subjects: </span> } 
         </span>
        {selXType ? <span className="sel-total">{showsel ? numsmp : 0} </span> :
            <span className="sel-total">{showsel ? numbr : 0} </span>}
        
        { (selXType && showsel && regflt) ?  regTable()  : null } 

        { selXType ? <Row class="p-2 d-flex justify-content-center" style={{fontSize:"1rem"}}> Selected subjects: &nbsp; 
           <span style="color:#923"><b>{showsel ? numbr : 0} </b></span> </Row> : null }
        <Row class="flex-nowrap">
          {showsel && subjTable() } 
        </Row>
        { showsel && <Row style={{paddingTop: "1em" }} >
             { showDlButton ? <>
                <Row class="p-2 m-2">
                    { mixprotos.length>1 && <WarnProto key={Date.now()} prlist={mixprotos} /> }
                </Row>
                <Row class="d-flex w-100 flex-nowrap justify-content-center">
                 <Col class="d-flex justify-content-center">  
                     <Button class="btn-light checkout-btn btn-download" onClick={toggleModal}>
                       <b>Download</b></Button>
                    { restrictedDatasets.length ? 
                      <DlgRequest datasets={restrictedDatasets} isShowing={isModalShowing}  hide={toggleModal} /> :                    
                      <DlgDownload isShowing={isModalShowing}  hide={toggleModal} /> }
                 </Col>
                  <Col class="d-flex justify-content-center">
                     <Button class="btn-light checkout-btn btn-xplore"><b>Explore</b></Button>
                 </Col>
               </Row>
              </> : <> {selXType ? <div class="mx-auto" style="font-size:0.8rem;color:red"> 
                          <span>Please selected a dataset. </span> 
                       </div> : <> {brSaveDialog()} </>
                       
                       }
                     </>
             } 
         </Row>
         }
      </Col>
  )
}

export default RSelSummary
