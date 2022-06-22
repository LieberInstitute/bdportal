import $ from 'jquery';
import { DlgModal } from './DlgModal';
import './spinners.css';
import {useState, useRef, useEffect} from "preact/hooks";
import {Row, Col, Input, Button, Label, FormGroup } from 'reactstrap';
import {buildRSE, saveRStagedFile, checkGeneList} from './RDataCtx';
import {ToastBox} from './ToastBox';
//import axios from 'axios';

const  fTypes=['gene', 'tx', 'ex', 'jx']; //feature types
const ftNames=['Gene', 'Transcript', 'Exon', 'Junction']

/* Matrix/Assay download row + control(spinner + Button)
props :
   prefix : file name (prefix)
   fext : 'rda' | 'csv.gz'
   fidx :  idx in fTypes/ftNames
   norm : 0 (counts) or 1 (rpmkm)
*/
function MxDlRow ({prefix, fidx, norm, fext, datasets, samples, genes}) {

  const [fstatus, setFStatus]=useState(0) // 0 = nothing/ok, 1 = building, -1 = error
  const [saved, setSaved]=useState("")
  const ds0= (datasets && datasets.length)? datasets[0] : ""
  const numds=(datasets && datasets.length)? datasets.length : 0
  const numsamples =  (samples && samples.length)? samples.length : 0

  const filename = `${prefix}${fTypes[fidx]}_n${numsamples}.${fext}`

  function dlClick() {
    //setFStatus( v => (v<0 ? 0 : (v ? -1 : 1)) )
    if (fstatus!==0) alert(" Saving operation in progress, try later. ")
    setFStatus(1) //enter file prep state
    let dtype=norm ? 'rpkm' : 'counts'
    if (fidx==1) dtype='tpm'
    let glst=[]
    if (genes) {
      if (typeof genes == 'function') {
         const genelist=genes() //retrieve the gene list from parent as a comma-delimited list
         if (genelist) {
            if (Array.isArray(genelist)) glst=genelist
            else if (genelist.length>1) { //assume prepared string, comma delimited}
              glst=genelist.split(',')
            }
         }
      }
      else if (Array.isArray(genes)) glst=genes
    }
    buildRSE(filename, samples, fTypes[fidx], dtype, fext, glst)
			 .then( res => {
				 //console.log("res=", res)
				 return res.json()
			  } )
			 .then( fn => {
					// 1st row: header, 2nd row: data = filename
					let fname=""
					if (fn.length>1) fname=fn[1][0]
          //console.log("fn prepared:", fname)
					if (fname) {
						 setSaved('saved.')
             setFStatus(0)
					   //simulate a link->click to download the file:
					   saveRStagedFile(fname)
					}
			 })
  }

  useEffect( ()=>{
    setSaved("")
    setFStatus(0)
  }, [prefix, fext, norm, datasets, samples])
  // Button: disabled={fstatus!==0}  ?
  let ctype=norm ? (fidx==1 ? "(TPM)": fidx==3 ? "(RP10M)" : "(RPKM)") : "";
  let disabled=(norm==0 && fidx==1) || (fidx>0 && numds>1)
  return( <Col className="m-0 p-0 pl-1" style="border-top:1px solid #ddd;">
     <Row className="form-group d-flex flex-nowrap justify-content-between mb-0 pb-0"
          style="font-size:90%;min-height:22px;">
        <Col className="pl-0" style="min-width:25rem;"><b>{ftNames[fidx]}</b> data {ctype}</Col>
        <Col className="d-flex justify-content-center m-0 p-0">
            <div class="m-0 p-0" style="position:relative">
            {(fstatus==1) ? <div style="position:relative;">
                    <div class="spinner-bars"><span></span><span></span><span></span><span></span><span></span></div>
                            </div>
             : <div class="red-info-text" style="position:relative;top:1px;">
               {(fstatus<0) ? <span style="position:relative;font-size:14px;line-height:15px;top:3px;margin-left:-6px;" > &nbsp; &nbsp;Error! </span> :
                              <span style="color:#777;position:relative;top:2px;"> {saved} </span> }
               </div>
            }
            </div>
        </Col>
     </Row>

     <Row className="form-group d-flex justify-content-between flex-nowrap mt-0 pt-0 pb-1" style="font-size:90%;">
      <Col className="pl-0 align-self-begin overflow-hidden text-nowrap"
           style="color:#666;min-width:25rem;background-color:#f4f4f4">
        {filename} </Col>
        <Col className="d-flex align-self-begin justify-content-end">
         <Row>
          <Button id="bsave" className="btn-sm app-btn" disabled={disabled} onClick={dlClick}>Export</Button>
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
  */

export function DlgDownload( props ) {

  const [prefix, setPrefix] = useState('seldata_');
  const [fext, setFext] = useState('rda')
  const [geneList, setGeneList] = useState('')
  const [geneCheckInfo, setGeneCheckInfo]=useState('')
  const [norm, setNorm] = useState(1)
  const [numsamples, setNumSamples] = useState(0)
  const [ds0, setDs0] = useState('')
  const refData=useRef( {
      datasets : null,
      samples : null,
      lastGeneList: '' //last gene list checked

  })


  const m=refData.current;

  function afterOpen() {
    setGeneCheckInfo('')
    if (props.getData)  {
      const data=props.getData()
      if (data.datasets) {
        m.datasets=data.datasets
        setDs0(m.datasets[0])
        setPrefix(`${m.datasets[0]}_`)
      }
      if (data.samples)  {
        m.samples=data.samples
        setNumSamples(m.samples.length)
      }
    }
  }

  function onFmtChange(e) {
    setFext((e.target.id=="r1")?'rda':'csv.gz')
  }
  function onNormChange(e) {
    setNorm((e.target.id=="n0")? 0:1)
  }

  function glstCheck() {
    //TODO:  check genes in the database
    setGeneCheckInfo('')
    let glst=$('#inglst').val()
    glst=glst.trim()
    if (glst!==geneList) setGeneList(glst)
    if (glst.length<2) return;
    const garr=glst.split(/[,|;:.\s]+/)
    //check list against the database
    let guniq = garr.filter((item, i, ar) => ar.indexOf(item) === i).sort();
    glst=guniq.join(',')
    if (glst!==m.lastGeneList) {
      m.lastGeneList=glst;
      checkGeneList(guniq, 'gencode25')
      .then( res => {
        //console.log("res=", res)
        return res.json()
      } )
      .then( dt => {
        // 1st row: header, 2nd row: data = id, gene_id, symbol, type
        let rglst=null
        let gmiss=[]
        if (dt.length>1) {
          rglst= dt.slice(1).map( (v)=>v[2] )
          rglst=rglst.filter((item, i, ar) => ar.indexOf(item) === i).sort()
          guniq.forEach( (v)=> {
               if (rglst.indexOf(v)<0) gmiss.push(v)
            })
        }
        const msg= gmiss.length ? `Could not recognize: ${gmiss.join(', ')}` :
                          'All given genes names were recognized.';
        console.log(" gene check msg: ", msg)
        setGeneCheckInfo(msg)
      })
   }
   return glst
  }

  function onCheckGeneList() {
    const glst=glstCheck()
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

  function onExitGeneList() {
    let glst=$('#inglst').val()
    glst=glst.trim()
    if (glst!==geneList) setGeneList(glst)
  }
  const glstDisabled=false;

  function prefixChange( {target}) { setPrefix(target.value); }
  return (<DlgModal { ...props} title="Export expression data" justClose="1" onShow={afterOpen} width="50em">
    <Row className="form-group d-flex justify-content-center flex-nowrap mb-1" style="font-size:90%;">
      <Col className="d-flex justify-content-between m-0 p-0">
              <Label className="frm-label text-nowrap">File name:</Label>&nbsp;
              <Input id="fpre" className="frm-input" onChange={prefixChange} value={prefix} />
      </Col>
    </Row>
    <Row className="form-group d-flex justify-content-center flex-nowrap mt-0 pt-0 mb-0 pb-0" style="font-size:90%;">
      <Col className="d-flex-column justify-content-start ml-4 pl-4">
        <Row>Format</Row>
        <FormGroup tag="fieldset" onChange={onFmtChange}>
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
      <Col className="d-flex-column justify-content-start">
      <Row>Values</Row>
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
    { norm ? <Row className="form-group d-flex justify-content-center flex-nowrap mb-2" style="font-size:90%;">
      <Col xs="3" className="p-0 m-0 align-self-begin text-nowrap" style="min-width:6.2rem;top:3px;">Restrict to genes:</Col>
      <Col className="pl-1 ml-0 mr-1 pr-1">
              <Input id="inglst" className="frm-input d-inline-block" style="font-size:14px;width:19rem;"
                 value={geneList} onKeyDown={handleEnter} onBlur={onExitGeneList} />
              <Button id="bglst" className="btn-sm app-btn" style="color:#a00;height:22px;margin-left:2px;" onClick={glstClear}>&#x2715;</Button>
        <Row className="d-flex justify-content-between align-content-center p-0 m-0 mt-1">
          <Label className="align-self-center p-0 m-0" style="font-size:13px;color:#777;">e.g. GRIN2A,GRIN2B,SP4</Label>
          <Button id="bglst" className="btn-sm app-btn align-self-center" disabled={glstDisabled} onClick={onCheckGeneList}>Check</Button>
        </Row>
      </Col>
      </Row> : null }
    { fTypes.map( (it, i) =>
      <MxDlRow key={i} fidx={i} norm={norm} fext={fext} prefix={prefix} datasets={m.datasets}
           samples={m.samples} genes={glstCheck} />
     )}
     { (geneCheckInfo.length>0) && <ToastBox id="tsGeneCheck" title=" Info " text={geneCheckInfo} /> }
  </DlgModal>
 )
}
