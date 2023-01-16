import $ from 'jquery';
import { useEffect, useState } from "preact/hooks";
import { APP_BASE_URL } from '../../appcfg'
import './style.css';
import '../../comp/spinners.css';
import { Row, Col, Button, Label, Input, CustomInput, Nav, NavItem, NavLink } from 'reactstrap'
import { ToastBox } from '../../comp/ToastBox'
import {
  subjXTable, getRegionCounts, getSelDatasets, getSelSampleData, dtBrXsel,
  checkGeneList, useScript, getRStagedJSON, getPlot, rGlobs, logAction } from '../../comp/RDataCtx';

import { clearTooltips, setupTooltips } from '../../comp/ui';

function showPlot(div, data) {
  //$(`#${div}`).css({'background-color':'yellow' })
  window.PLOTLYENV = { 'BASE_URL': 'https://plotly.com' };
  const gd = document.getElementById(div)
  if (data.config) {
    data.config.responsive = true;
    //Plotly.plot(gd, data);
    Plotly.newPlot(div, data);
  }
}

async function logPlot(plType, glst) { //log samples?
  if (rGlobs.login) {
    const ds=getSelDatasets();
    const datasets=ds.map((dd)=> dd[0]);
    let genes=glst;
    if (Array.isArray(glst)) genes=glst.join(',');
    return await logAction('explore', datasets, `plot-${plType}: ${genes}`);
  }
  return 1; //Promise.resolve(1);
}

function ExpAgePlots({ samples, glstCheck, mgenes }) { //props.samples = sample IDs to plot
  const [plotJSON, setPlotJSON] = useState(null)
  const [geneList, setGeneList] = useState('')
  const [plstatus, setPlStatus] = useState(0) // 0 - idle, 1 - building-plot

  function glstClear() {
    setGeneList("")
    $('#inglst').val("")
    if (mgenes) mgenes[0]="";
    clearPlot()
  }

  function plotFetched(plotData, divName) {
    showPlot(divName, plotData)
    setPlStatus(0)
    setPlotJSON(plotData)
  }

  function clearPlot() {
    $(`#plot1`).html("")
    setPlotJSON(null)
  }

  async function onPlotClick() {
    let genes = $('#inglst').val().trim()
    if (mgenes) mgenes[0]=genes
    if (genes.length>1) await logPlot('age', genes);
    glstCheck(genes).then(glst => {
      clearPlot()
      if (glst.length == 0) return;
      // setFStatus(1) //enter plot prep state, show it somehow
      setPlStatus(1)
      setPlotJSON(null)
      //console.log(" curated gene list: ", gtlst)
      getPlot('age', samples, glst).then(
        res => res.json()
      ).then(fn => {
        let fname = "";
        if (fn.length > 1) fname = fn[1][0]
        if (fname) {
          getRStagedJSON(fname, plotFetched, 'plot1')
        }
      })
    }) //this returns the list of "valid" genes
  }

  useEffect( ()=> {
     if (mgenes && mgenes[0])
        $('#inglst').val(mgenes[0])
  }, [mgenes])

  // style="width: 100%; height: 100%;"
  return (<Row className="d-flex flex-nowrap flex-fill">
    <Col xs="12" className="d-flex flex-column mt-2">
      <Row className="d-flex flex-row flex-nowrap align-items-center ml-1 mr-0">
        <Col className="col-auto d-flex p-0 m-0 mr-2 ">
          <Label className="p-0 m-0 red-info-text" style="font-size:14px;">
            Enter up to 5 genes to plot their expression levels with subject age, in the selected samples.
          </Label>
        </Col>
      </Row>
      <Row className="d-flex flex-row flex-nowrap align-items-center ml-1 mr-0 mb-2 ">
        <Col className="col-auto d-flex p-0 m-0 mr-2" style="top:1px;">
          <Label className="p-0 m-0" style="font-size:12px;color:#777;">e.g. SP4,TCF4,ZNF804A,DRD2</Label>
        </Col>
        <Col className="col-auto d-flex p-0 m-0">
          <Input id="inglst" className="frm-input d-inline-block" style="font-size:14px;min-width:20rem;" />
          <Button id="bglst" className="btn-sm app-btn" style="color:#a00;height:22px;margin-left:2px;margin-top:3px;"
            disabled={plstatus > 0} onClick={glstClear}>&#x2715;</Button>
        </Col>
        <Col className="col-auto d-flex">
          <Button id="bglst" className="btn-sm app-btn align-self-center" style="padding:4px 10px; color:#844;"
            disabled={plstatus > 0} onClick={onPlotClick}><b>Plot</b></Button>
          {(plstatus > 0) && <div class="spinner-bars" style="position:relative;top:2px;">
            <span></span><span></span><span></span><span></span><span></span> </div>}
        </Col>
      </Row>
      <Row className="d-flex flex-fill">
        <div id="plot1" class="w-100 align-self-stretch plotly-graph-div">
          {(plstatus > 0) ? <span class="red-info-text">.. building plot, please wait .. </span>
            : <>{(plotJSON) ? <span> loaded </span>
              : <span class="red-info-text">Provide a list of genes and click <b>Plot</b></span>
            }</>
          }
        </div>
      </Row>
    </Col>
  </Row>)
}

function ExpBoxPlots({ samples, glstCheck, mgenes, numregions }) {
  const [plotJSON, setPlotJSON] = useState(null)
  const [geneList, setGeneList] = useState('')
  const [plstatus, setPlStatus] = useState(0) // 0 - idle, 1 - building-plot
  const [byRegion, setByRegion] = useState(false)
  function glstClear() {
    setGeneList("")
    $('#inglst').val("")
    if (mgenes) mgenes[0]="";
    clearPlot()
  }

  function plotFetched(plotData, divName) {
    showPlot(divName, plotData)
    setPlStatus(0)
    setPlotJSON(plotData)
  }

  function clearPlot() {
    $(`#plot1`).html("")
    setPlotJSON(null)
  }

  async function onPlotClick() {
    let genes = $('#inglst').val().trim()
    if (mgenes) mgenes[0]=genes
    if (genes.length>1)
       await logPlot(byRegion ? 'box-region':'box-gene', genes);
    glstCheck(genes).then(glst => { //the list of valid genes
      clearPlot()
      setPlotJSON(null)
      if (glst.length == 0) return;
      if (byRegion && glst.length>1) glst = [ glst[0] ]
      // setFStatus(1) //enter plot prep state, show it somehow
      setPlStatus(1)
      //console.log(" curated gene list: ", gtlst)
      getPlot( byRegion ? 'box-region':'box-gene', samples, glst).then(
        res => res.json()
      ).then(fn => {
        let fname = "";
        //console.log(" getPlot returned fname =", fn)
        if (fn.length > 1) fname = fn[1][0]
        if (fname) {
          getRStagedJSON(fname, plotFetched, 'plot1')
        }
      })
    })
  }

  function clickByRegion() {
      const ckVal = $('#ckPlotByRegion')[0].checked
      console.log(" ckPlotByRegion =", ckVal)
      clearPlot()
      setPlotJSON(null)
      setByRegion(ckVal)
  }

  useEffect( ()=> {
    if (mgenes && mgenes[0])
    $('#inglst').val(mgenes[0])
   }, [mgenes])

  const provide=byRegion ? "Enter a gene symbol" : "Provide a list of genes" ;

  return (<Row className="d-flex flex-nowrap flex-fill">
    <Col xs="12" className="d-flex flex-column mt-2">
      <Row className="d-flex flex-row flex-nowrap align-items-center ml-1 mr-0">
        <Col className="col-auto d-flex p-0 m-0 mr-2">
          <Label className="p-0 m-0 red-info-text" style="font-size:14px;text-align:left;">
            Enter up to 8 genes to plot their expression levels in the selected samples by diagnosis.<br />
          </Label>
        </Col>
        <Col>
          {(numregions>1) && <div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="" >
            <CustomInput type="checkbox" id="ckPlotByRegion" onClick={clickByRegion} />
            Plot gene by brain region
          </div> }
        </Col>
      </Row>
      <Row className="d-flex flex-row flex-nowrap align-items-center ml-1 mr-0 mb-2 ">
        <Col className="col-auto d-flex p-0 m-0 mr-2" style="top:1px;">
          <Label className="p-0 m-0" style="font-size:12px;color:#777;">e.g. COMT,TCF4,ZNF804A,DRD2,SNX19</Label>
        </Col>
        <Col className="col-auto d-flex p-0 m-0">
          <Input id="inglst" className="frm-input d-inline-block" style="font-size:14px;min-width:24rem;" />
          <Button id="bglst" className="btn-sm app-btn" style="color:#a00;height:22px;margin-left:2px;margin-top:3px;"
            disabled={plstatus > 0} onClick={glstClear}>&#x2715;</Button>
        </Col>
        <Col className="col-auto d-flex">
          <Button id="bglst" className="btn-sm app-btn align-self-center" style="padding:4px 10px;"
            disabled={plstatus > 0} onClick={onPlotClick}><b>Plot</b></Button>
          {(plstatus > 0) && <div class="spinner-bars" style="position:relative;top:2px;">
            <span></span><span></span><span></span><span></span><span></span> </div>}
        </Col>
      </Row>
      <Row className="d-flex flex-fill">
        <div id="plot1" class="w-100 align-self-stretch plotly-graph-div">
          {(plstatus > 0) ? <span class="red-info-text"> .. building plot, please wait .. </span>
            : <>{(plotJSON) ? <span> loaded </span>
              : <span class="red-info-text"> {provide} and click <b>Plot</b></span>
            }</>
          }
        </div>
      </Row>
    </Col>
  </Row>)
}

const RnaExplore = ({ selData, mdata, style }) => {
  const [nav, setNav] = useState(mdata.xploreSection)

  const [geneCheckInfo, setGeneCheckInfo] = useState('')

  useEffect(() => {

    $('.toast').toast({ delay: 7000 })

    setupTooltips()
    return () => { //clean-up code
      clearTooltips()
    }
  }, [])

  useEffect(() => {
    if (geneCheckInfo.length > 1) {
      $("#tsGeneCheck").toast('show')
      //setTimeout( ()=> {setGeneCheckInfo('')}, 500 )
    }
  }, [geneCheckInfo])

  async function glstCheck(glst) {
    //must return an array of strings with the valid gene symbols
    setGeneCheckInfo('')
    //let glst=$('#inglst').val()
    const nogenes = "Please enter a valid list of gene symbols."
    if (!glst) {
      setGeneCheckInfo(nogenes)
      return [];
    }
    glst = glst.trim()
    //if (glst!==geneList) setGeneList(glst)
    if (glst.length < 2) { setGeneCheckInfo(nogenes); return [] }
    const garr = glst.split(/[,|;:.\s]+/).filter(s => s.length > 0).map(s => s.toUpperCase())

    //check list against the database
    let guniq = garr.filter((item, i, ar) => ar.indexOf(item) === i) //.sort();
    glst = guniq.join(',')
    const gvalid = []
    const dt = await checkGeneList(guniq, 'gencode25')
    /*
      .then( res => {
        return res.json()
      } )
      .then( dt => { */
    // 1st row: header, 2nd row: data = id, gene_id, symbol, type
    let rglst = null
    let gmiss = []
    if (dt.length > 1) {
      rglst = dt.slice(1).map(v => v[2])
      rglst = rglst.filter((item, i, ar) => ar.indexOf(item) === i) //.sort()
      guniq.forEach((v) => {
        if (rglst.indexOf(v) < 0) gmiss.push(v)
        else gvalid.push(v)
      })
    } else { gmiss.push(...guniq) }
    const msg = gmiss.length ? `Could not recognize gene symbols: ${gmiss.join(', ')}` :
      '';
    setGeneCheckInfo(msg)
    //}) .then
    // return glst
    return gvalid; //list of gene symbols found in the database
  }

  useScript("https://cdn.plot.ly/plotly-latest.min.js", "plotlyJS");

  function clickNav(e) {
    const navid=Number(e.target.id)
    mdata.xploreSection=navid
    setNav(navid)
  }

  if (!rGlobs.validSelection) {
    return (<div class="col-12 d-flex flex-column">
      <Row className="pt-3 d-flex flex-nowrap flex-row align-items-center justify-content-center">
        <Col><div style="color:#d23;line-height:200%;font-size:100%;">
          <span>Please make a sample selection in the <b>Select</b> tab</span>
        </div>
        </Col>
      </Row></div>)
  }



  const smpData = getSelSampleData();
  const numsmp = smpData.samples.length;
  const numbr = dtBrXsel.size;
  const nRegions = getRegionCounts();

  return (<div class="col-12 d-flex flex-nowrap flex-column">
    <Row className="flex-grow-1 pt-1 mt-1 justify-content-start flex-nowrap">
      <Col className="d-flex p-0 m-0 colExpNav justify-content-start">
        <Nav vertical tabs>
          <NavItem>
            <NavLink className="app-navlnk" id="1" active={nav == 1} onClick={clickNav} href="#">Age Plot</NavLink>
          </NavItem>
          <NavItem>
            <NavLink className="app-navlnk" id="2" active={nav == 2} onClick={clickNav} href="#">Gene Boxplots</NavLink>
          </NavItem>
        </Nav>
      </Col>
      <Col className="d-flex flex-column flex-fill">
        <Row className="d-flex align-items-center justify-content-center"
          style="padding-bottom:6px;border-bottom:1px solid #ddd;">
          <div class="col-auto d-flex flex-nowrap align-items-center justify-content-center">
            <Col className="col-auto d-flex flex-column align-items-center">
              <Label><b>{numsmp}</b>&nbsp; samples </Label>
              <Label><b>{numbr}</b>&nbsp; subjects</Label>
            </Col>
            <Col className="col-auto d-flex">
              {subjXTable()}
            </Col>
            <Col className="col-auto d-flex flex-column">
              <Row className="mb-0 pb-0">
                <span style="font-size:90%;color:#777;display:block;">Brain regions (samples)</span>
              </Row>
              <Row className="m-0 p-0 ml-3">
                <table class='regtbl'>
                  {nRegions.map((r, i) =>
                    <tr key={i}><td>{r[0]}&nbsp;<span>({r[1]})</span></td></tr>
                  )}
                </table>
              </Row>
            </Col>
          </div>
        </Row>
        {(nav == 1) ? <ExpAgePlots samples={smpData.samples} glstCheck={glstCheck} mgenes={mdata.genelist}/>
          : <ExpBoxPlots samples={smpData.samples} glstCheck={glstCheck} mgenes={mdata.genelist} numregions={nRegions.length} />}
      </Col>
    </Row>
    {(geneCheckInfo.length > 0) && <ToastBox id="tsGeneCheck" title=" Info " text={geneCheckInfo} />}
  </div>)
}

export default RnaExplore;
