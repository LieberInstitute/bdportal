import $ from 'jquery';
import { DlgModal } from './DlgModal';
import './spinners.css';
import {useState, useRef, useEffect} from "preact/hooks";
import {Row, Col, Input, Button, Label, FormGroup } from 'reactstrap';
import {buildRSE, saveRStagedFile, checkGeneList} from './RDataCtx';
import {saveFile, rowCSV, rowTSV} from "./gutils";

import {ToastBox} from './ToastBox';
//import axios from 'axios';

const  fTypes=['Gene', 'Tx', 'Exon', 'Jxn']; //feature types
const ftNames=['Gene', 'Transcript', 'Exon', 'Junction']

/* Matrix/Assay download row + control(spinner + Button)
props :
   prefix : file name (prefix)
   fext : 'rda' | 'csv.gz'
   fidx :  idx in fTypes/ftNames
   norm : 0 (counts) or 1 (rpmkm)
*/
function MxDlRow ({prefix, fidx, norm, fext, datasets, samples, getGenes, genestxt, brsum, onStatusChange, getAllStatus, selsheet}) {

  const [fstatus, setFStatus]=useState(0) // 0 = nothing/ok, 1 = building, -1 = error
  const [saved, setSaved]=useState("")
  //const ds0= (datasets && datasets.length)? datasets[0] : ""
  const numds=(datasets && datasets.length)? datasets.length : 0
  const numsamples =  (samples && samples.length)? samples.length : 0
  //const ftype= fidx<4 ? fTypes[fidx] : ( fidx==4 ? 'Selection' : (fidx==5 ? 'Br_Counts':  'metadata'))
  const ftype= fidx<4 ? fTypes[fidx] : ( fidx==4 ? 'Sample_Metadata' : (fidx==5 ? 'Selection_Info' :  'Br_Counts'))
  if (fidx>3) fext = 'csv'; // metadata, selsheet, brsum
  const filename = `${prefix}_${ftype}_n${numsamples}.${fext}`
  //if (fidx==4) fext = 'meta'

  async function dlClick() {
    //setFStatus( v => (v<0 ? 0 : (v ? -1 : 1)) )
    //return;
    // ^^^^ just for testing
    const exporting=getAllStatus() //bitmap with all exporting status
    if (fstatus!==0 || exporting) {
      $("#tsExporting").toast('show')
       return;
    }
    setFStatus(1) //enter file prep state
    if (onStatusChange) onStatusChange(fidx, 1)
    let dtype=norm ? 'rpkm' : 'counts'
    if (fidx==1) dtype='tpm'
    let glst='', gvalid=[]
    let genelst=[]
    if (norm && getGenes && (typeof getGenes == 'function')) {
         [glst, gvalid]=await getGenes() //retrieve the gene list from parent as a string with comma-delimited,
                                   // and gvalid as an array with validated gene symbols
    }
    if (fidx<5)  {
      const ctype=fidx<4 ? fTypes[fidx].charAt(0).toLowerCase() : 'm';
      buildRSE(filename, samples, ctype, dtype, fext, gvalid)
  			 .then( res => {
  				 //console.log("dl got res=", res)
  				 return res.json()
  			  } )
  			 .then( fn => {
            //console.log("dl got fn=", fn)
  					// 1st row: header, 2nd row: data = filename
  					let fname=""
  					if (fn.length>1) fname=fn[1][0]
            //console.log("fn prepared:", fname)
  					if (fname) {
               setFStatus(0)
               if (onStatusChange) onStatusChange(fidx, 0)
  					   //simulate a link->click to download the file:
               saveRStagedFile(fname).then( href=>setSaved(href) )
  					} else {
              setFStatus(-1)
              if (onStatusChange) onStatusChange(fidx, 0)
              
            }
  			 })
      return;
     }
     if (fidx==5) { //save selsheet as csv
      if (selsheet) {
        if (gvalid.length && selsheet.length>1) {
          const slast=selsheet[0].length-1
          if (selsheet[0][slast].match(/Gene/i)) {
            selsheet[1][slast]=gvalid.join(',')
          } else {
            selsheet[0].push('Gene_list')
            selsheet[1].push(gvalid.join(','))
          }
        }
        let fdata=""
        const fmt=1 //could be TSV as well, for fmt!=1
        if (fmt==1) selsheet.forEach( row => fdata+=rowCSV(row) )
          else selsheet.forEach( row => fdata+=rowTSV(row) )
        setFStatus(0)
        if (onStatusChange) onStatusChange(fidx, 0) //allow other downloads
        saveFile(fdata,  filename).then( ()=>setSaved(''))
       }
     }
     if (fidx==6 && brsum) {
        let fdata=""
        const fmt=1 //could be TSV as well, for fmt!=1
        if (fmt==1) brsum.forEach( row => fdata+=rowCSV(row) )
          else brsum.forEach( row => fdata+=rowTSV(row) )
        setFStatus(0)
        if (onStatusChange) onStatusChange(fidx, 0) //allow other downloads
        saveFile(fdata,  filename).then( ()=>setSaved(''))
     }
  }


  useEffect( ()=>{
    setSaved("")
    setFStatus(0)
  }, [prefix, fext, norm, datasets, samples, genestxt]) //genestxt is only there to indicate change

  // Button: disabled={fstatus!==0}  ?
  function savedLnk() {
    if (saved.length<1) return null;
    return (<a href={saved}>Saved.</a>)
  }

  let fcaption='', ctype=''
  if (fidx<4) {
    ctype=norm ? (fidx==1 ? "(TPM)": fidx==3 ? "(RP10M)" : "(RPKM)") : "";
    fcaption=`${ftNames[fidx]} data ${ctype}`
  } else {
    if (fidx==4) fcaption='Sample metadata'
     else if (fidx==5) fcaption='Selection info table'
        else if (fidx==6) fcaption='Subjects summary table'
  }

  let disabled=(norm==0 && fidx==1) || (numds>1 && fidx>0 && fidx<4)
  return( <Col className="m-0 p-0 pl-1" style="border-top:1px solid #ddd;">
     <Row className="form-group d-flex flex-nowrap justify-content-between mb-0 pb-0"
          style="font-size:90%;min-height:22px;">
        <Col className="col-auto pl-0" style="color:#222;">{fcaption}</Col>
        <Col className="d-flex justify-content-end m-0 p-0">
            <div class="d-flex flex-row align-items-center justify-content-end m-0 p-0" style="position:relative;width:10rem;">
              <div style="width:56px;height:16px;position:relative;font-size:14px;padding-right:4px;">
               {(fstatus==1) ? <div class="spinner-bars" style="position:relative;top:-2px;">
                                   <span></span><span></span><span></span><span></span><span></span>
                               </div>
                   : (fstatus<0) ? <span style="text-align:center;color:#c45;position:relative;top:-2px;" > &nbsp; &nbsp;Error! </span>
                                 : <span style="text-align:center;color:#777;position:relative;top:-2px;left:8px;"> {savedLnk()} </span>
               }
             </div>
            </div>
        </Col>
     </Row>

     <Row className="form-group d-flex justify-content-between flex-nowrap mt-0 pt-0 pb-1" style="font-size:90%;">
      <Col className="pl-0 pr-1 mr-1 flex-fill align-self-begin overflow-hidden text-nowrap"
           style="color:#666;min-width:25rem;background-color:#f4f4f4">
        {filename}
      </Col>
      <Col className="d-flex align-self-begin justify-content-end">
         <Row>
          <Button id="bsave" className="btn-sm app-btn" disabled={disabled} onClick={dlClick}>{fidx<5 ? "Export" : "Save"}</Button>
        </Row>
      </Col>
    </Row>
   </Col>)
}


  /*
    data can be retrieved by calling props.getData():
      {
         datasets: [ ] (array of dataset names)
         samples: [  ] array of sample_ids
      }
      data should be retrieved only once when the dialog is shown the first time

      props.selsheet : selection datasheet passed down from RSelSummary
      props.getBrSum : callback to retrieve br totals array
  */

export function DlgDownload( props ) {

  const [prefix, setPrefix] = useState('seldata_');
  const [fext, setFext] = useState('rda')
  const [geneList, setGeneList] = useState('')
  const [geneCheckInfo, setGeneCheckInfo]=useState('')
  const [norm, setNorm] = useState(1)
  const [numsamples, setNumSamples] = useState(0)
 // const [ds0, setDs0] = useState('')
  const [exporting, setExporting]=useState(0) //bitfield for primitive monitoring of exporting in progress
  const refData=useRef( {
      brsum : null,
      datasets : null,
      samples : null,
      lastGeneList: '', //last gene list checked
      lastValidGenes: [], //last set of valid genes given

  })
  const m=refData.current;

  function afterOpen() {
    setGeneCheckInfo('')
    setExporting(0)
    if (props.getData)  {
      const data=props.getData()
      if (data.datasets) {
        m.datasets=data.datasets
        //setDs0(m.datasets[0])
        const fprefix=m.datasets.join('.')
        setPrefix(fprefix)
      }
      if (data.samples)  {
        m.samples=data.samples
        setNumSamples(m.samples.length)
      }
    }
    if (props.getBrSum) {
       m.brsum=props.getBrSum()
    }
  }

  function onFmtChange(e) {
    setFext((e.target.id=="r1")?'rda':'csv.gz')
  }
  function onNormChange(e) {
    const raw=(e.target.id=="n0");
    if (raw) glstClear();
    setNorm(raw ? 0:1)
  }

  async function glstCheck() { //assumes #inglst exists!
    //TODO:  check genes in the database
    setGeneCheckInfo('')
    if (norm==0) return ['', []];
    let glst=$('#inglst').val()
    if (!glst) return ['', []];
    glst=glst.trim()
    if (glst!==geneList) setGeneList(glst)
    if (glst.length<2) return ['', []];
    const garr=glst.split(/[,|;:.\s]+/).filter(s => s)

    //check list against the database
    const guniq = garr.filter((item, i, ar) => ar.indexOf(item) === i).map( g => g.toUpperCase() ) //.sort();
    glst=guniq.join(',')
    if (glst!==m.lastGeneList) {
      m.lastGeneList=glst;
      m.lastValidGenes.length=0;
      const dt=await checkGeneList(guniq, 'gencode25')
      /* .then( res => {
        return res.json()
      } )
      .then( dt => { */
        // 1st row: header, 2nd row: data = id, gene_id, symbol, type
        let rglst=null
        let gmiss=[]
        if (dt && dt.length>1) {
          rglst= dt.slice(1).map( (v)=>v[2] )
          rglst=rglst.filter((item, i, ar) => ar.indexOf(item) === i) //.sort()
          guniq.forEach( (v)=> {
               if (rglst.indexOf(v)<0) gmiss.push(v)
                  else m.lastValidGenes.push(v)
            })
        }
        const msg= gmiss.length ? `Could not recognize: ${gmiss.join(', ')}` :
                                  'All given genes were recognized.';
        setGeneCheckInfo(msg)
      // }) //.then
   }
   return [m.lastGeneList, m.lastValidGenes]
  }

  async function onCheckGeneList() {
    const [glst, gvalid]=await glstCheck()
    if (glst!=geneList) setGeneList(glst)
  }

  useEffect( ()=> {
    if (geneCheckInfo.length>1)  {
       $("#tsGeneCheck").toast('show')
       //setTimeout( ()=> {setGeneCheckInfo('')}, 500 )
    }
  },[geneCheckInfo])


  function handleEnter(e) {
    const key=e.key.toLowerCase()
    if ( key === "enter" || key === "tab") {
      const form = e.target.form;
      const index = [...form].indexOf(e.target);
      form.elements[index + 1].focus();
      e.preventDefault();
      glstCheck();
    }
  }

  function glstClear() {
    setGeneList("")
    //$('#inglst').val("")
  }

  function onExportStatus(fidx, status) { //fidx must be 0,1,2,3 | status is 1 only if exporting, set back to 0 when done
        let v=exporting;
        if (status) {  v|=(1<<fidx) }
               else {  v&= ~(1<<fidx) }
        setExporting(v)
  }

  function getExportingStatus() { //children inquire about other exporting activity
      return exporting;
  }

  function onExitGeneList() {
    let glst=$('#inglst').val()
    glst=glst.trim()
    if (glst!==geneList) setGeneList(glst)
  }
  const glstDisabled=false;

  function prefixChange( {target}) { setPrefix(target.value); }

  return (<DlgModal { ...props} title="Export RNA-Seq data" justClose="1" onShow={afterOpen} width="38rem">
    <Row className="form-group d-flex justify-content-center flex-nowrap mb-1" style="font-size:90%;">
      <Col className="d-flex justify-content-between m-0 p-0">
              <Label className="frm-label text-nowrap">File name:</Label>&nbsp;
              <Input id="fpre" className="frm-input" onChange={prefixChange} value={prefix} />
      </Col>
    </Row>
    <Row className="form-group d-flex justify-content-center flex-nowrap mt-0 pt-0 mb-0 pb-0" style="font-size:90%;">
      <Col className="d-flex-column align-items-center justify-content-center ml-4 pl-4">
        <Row>Expression data format:</Row>
        <FormGroup className="ml-4" tag="fieldset" onChange={onFmtChange}>
          <FormGroup check>
            <Label check>
              <Input type="radio" id="r1" name="fmt" checked={(fext=='rda')} /> .rda (RSE)
            </Label>
            </FormGroup>
            <FormGroup check>
            <Label check>
              <Input type="radio" id="r2" name="fmt" checked={(fext=='csv.gz')} /> .csv.gz
            </Label>
           </FormGroup>
         </FormGroup>
      </Col>
      <Col className="d-flex-column justify-content-center align-items-center">
      <Row>Values:</Row>
       <FormGroup tag="fieldset" onChange={onNormChange}>
          <FormGroup check>
            <Label check>
              <Input type="radio" id="n0" name="norm" checked={(norm==0)} />raw counts
            </Label>
            </FormGroup>
            <FormGroup check>
            <Label check>
              <Input type="radio" id="n1" name="norm" checked={(norm==1)} />normalized
            </Label>
           </FormGroup>
         </FormGroup>
      </Col>
    </Row>
    { norm ? <Row className="form-group d-flex justify-content-center flex-nowrap mb-3" style="font-size:90%;">
      <Col className="col-auto p-0 m-0 ml-1 align-self-begin text-nowrap" style="top:3px;">Restrict to genes:</Col>
      <Col className="pl-1 ml-0 mr-0 pr-0">
        <Row className="d-flex flex-row flex-nowrap align-items-center ml-1 mr-0">
              <Col className="flex-fill p-0 m-0">
              <Input id="inglst" className="frm-input d-inline-block" style="font-size:14px;"
                 value={geneList} onKeyDown={handleEnter} onBlur={onExitGeneList} />
              </Col><Col className="p-0 m-0 ml-1">
              <Button id="bglst" className="btn-sm app-btn" style="color:#a00;height:22px;margin-left:2px;margin-top:-4px;" onClick={glstClear}>&#x2715;</Button>
              </Col>
        </Row>
        <Row className="d-flex justify-content-between align-content-center p-0 m-0 mt-1">
          <Label className="align-self-center p-0 m-0" style="font-size:13px;color:#777;">e.g. GRIN2A,GRIN2B,SP4</Label>
          <Button id="bglst" className="btn-sm app-btn align-self-center" disabled={glstDisabled} onClick={onCheckGeneList}>Check</Button>
        </Row>
      </Col>
      </Row> : null }

    <MxDlRow fidx={4} norm={norm} fext="csv" prefix={prefix} datasets={m.datasets}
         samples={m.samples} getGenes={glstCheck} genestxt={geneList} onStatusChange={onExportStatus} getAllStatus={getExportingStatus} />
    { fTypes.map( (it, i) =>
      <MxDlRow key={i} fidx={i} norm={norm} fext={fext} prefix={prefix} datasets={m.datasets}
           samples={m.samples} getGenes={glstCheck} genestxt={geneList} onStatusChange={onExportStatus} getAllStatus={getExportingStatus} />
     )}
    <MxDlRow fidx={6} norm={norm} fext="csv" prefix={prefix}  datasets={m.datasets} brsum={m.brsum}
           samples={m.samples} getGenes={glstCheck} genestxt={geneList} onStatusChange={onExportStatus} getAllStatus={getExportingStatus} />
    <MxDlRow fidx={5} norm={norm} fext="csv" prefix={prefix} datasets={m.datasets} selsheet={props.selsheet}
           samples={m.samples} getGenes={glstCheck} genestxt={geneList} onStatusChange={onExportStatus} getAllStatus={getExportingStatus} />
    { (geneCheckInfo.length>0) && <ToastBox id="tsGeneCheck" title=" Info " text={geneCheckInfo} /> }
    { (exporting>0) && <ToastBox id="tsExporting" title=" Info " text="Export operation in progress, please wait." /> }
  </DlgModal>
 )
}
