import $ from "jquery";
import {useEffect, useState, useRef, useReducer} from "preact/hooks"
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'
import './ui.css'
import {JRange} from './JRange'
import { applyFilterAgeRange } from "./RDataCtx";


function pdef(v, def) { return (typeof v === 'undefined' ? def : v)}
function pdefbool(v, def) {
  if (typeof v === 'undefined') return def
  return (v=="yes" || v==1)
}

function pdefnum(v, def) {
  if (typeof v === 'undefined') return def
  return Number(v)
}

//  {fetal, min, max, vmin, p_vmax, onChange, onApply }
//IMPORTANT: onChange is called with (vmin, vmax) parameters
//  with fetal PCW converted back to [-1, 0] : (PCW-40)/52

export function AgeRangePreset( {range, text, onClick} ) {
  function clickHandler(e) {
       if (onClick) { onClick(e, range)}
  }
  return (<div class="btn-age-preset" range={range} onClick={clickHandler}>
   {text}
    </div>)
}

export const fullAgeRange=[-1, 120] //no range filter!
const fetalScale=[0, 10, 20, 30, 40] //PCW = (age * 52) + 40   where -1<age<0
const fullScale=[fullAgeRange[0], 15, 30, 45, 60, 75, 90, 105, fullAgeRange[1]] //post-natal, regular age scale
export const fetalRange=[fetalScale[0], fetalScale[fetalScale.length-1]]

function guessFetal(vmin, vmax) {
   vmin=pdef(vmin, fullAgeRange[0])
   vmax=pdef(vmax, fullAgeRange[1])
   return (vmin<0 && vmax<=0)
}

function round2dec(num) { //round a value to 2 decimals
  return (Math.round( num * 100 + Number.EPSILON ) / 100)
}

// Component to set/read an age range
// Essential props :
//  drange: range array ref -- must be an array of 2 values,
//         every render is going to READ its values as the "appliedRange"
//         every "Apply"/"Clear" will WRITE (UPDATE) that array
//         the values are raw - negative values for fetal age, not PCW
//  fetal, vmin, vmax - if given INSTEAD of drange, the component will start displaying those
//                      and the parent is responsible of managing those props as the initial values to display
//  title = caption to show instead of id
//  notitleclick - preven un/collapsing on title click
//
export function AgeRange( props ) {

  //if fetal is true, the range slider starts by PCW (scale 0-42)
  // otherwise post-natal age is shown in years: 0-120

  const [rangeState, _setRangeState]=useState( {vmin:fullAgeRange[0], vmax:fullAgeRange[1], fetal:false} )
  //NOTE: in fetal mode, vmin and vmax are in PCW
  const rangeRW=props.drange // direct rangeData reference to read/update !!
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  //caret-left-fill icon
  const refDom = useRef(null) //reference to container DOM

  const refData = useRef({
     //keep track of last setting when toggling full vs fetal
    fetalSel: [0, 40],
    fullSel: [fullAgeRange[0],fullAgeRange[1]],
    // -- vv these are updated at creation time
    scale: fullScale,  //dynamically points to the right scale when switching between full and fetal
    mrange:fullAgeRange, //min-max range
    slState:rangeState, //current state {vmin, vmax, fetal} - updated before rangeState!
    //vmin, vmax : as normalized values (-1 .. ), not PCW!
    currentRange: [fullAgeRange[0], fullAgeRange[1]],
    appliedRange: [fullAgeRange[0], fullAgeRange[1]],
    // -- ^^
    jqCreated: false,
    internalRerender:false, // set to TRUE for each setRangeState() call
    renderKey:1234, // updated to force refresh for non-internalRerender
    btnApply: null,
    inputTimeout:null
  })

  const m=refData.current //convenience access

  function setRangeState(newSlState) {
      //const m=refData.current
      const sliderChanged = (m.slState.vmin!=newSlState.vmin ||  m.slState.vmax!=newSlState.vmax ||
                            m.slState.fetal!=newSlState.fetal)
      if (m.slState.fetal!=newSlState.fetal)  { //also update other internal state variables
          if (newSlState.fetal) {
            m.scale=fetalScale
            m.mrange=fetalRange
          } else { //full scale
            m.scale=fullScale
            m.mrange=fullAgeRange
          }
      }
      m.slState = { ... newSlState }
      if (sliderChanged) {
        const _vmin=  newSlState.fetal ? round2dec((newSlState.vmin-40)/52) : newSlState.vmin
        const _vmax=  newSlState.fetal ? round2dec((newSlState.vmax-40)/52) : newSlState.vmax
        if (newSlState.fetal) {
          m.fetalSel=[newSlState.vmin, newSlState.vmax]
        } else {
          m.fullSel=[newSlState.vmin, newSlState.vmax]
        }
        if (props.onChange) props.onChange(_vmin, _vmax)
        m.currentRange[0]=_vmin;
        m.currentRange[1]=_vmax;
        /*
        if (m.currentRange[0]!==m.appliedRange[0] || m.currentRange[1]!==m.appliedRange[1])
           rangeChanged()
        */
      }
      //update the state - note that rangeState may only be updated in the next render!
      m.internalRerender=true
      _setRangeState(newSlState)
  }

  function haveRangeFilter() { //to show the Apply button
    return (m.currentRange[0]!=fullAgeRange[0] || m.currentRange[1]!=fullAgeRange[1])
  }

  function onApplyClick() {
      //actually apply the changes here --> trigger updateCounts()
      if (rangeRW) {
        if (m.currentRange[0]===fullAgeRange[0] && m.currentRange[1]===fullAgeRange[1])
           rangeRW.length=0
         else {
          rangeRW[0]=m.currentRange[0]
          rangeRW[1]=m.currentRange[1]
         }
      }
      m.appliedRange[0]=m.currentRange[0]
      m.appliedRange[1]=m.currentRange[1]
      //notifyUpdate(fid);
      if (haveRangeFilter()) collapse()
          else unCollapse();
      if (props.onApply) // parent should call updateCounts() and notifyChange()
        props.onApply(m.appliedRange[0], m.appliedRange[1])
      forceUpdate() // tell React to update this component
  }

  function onOnlyClick(e) { // dismiss age range filter AND APPLY IT too!
    //clear filter
    m.currentRange[0]=fullAgeRange[0]
    m.currentRange[1]=fullAgeRange[1]
    setRangeState( { vmin:fullAgeRange[0], vmax:fullAgeRange[1], fetal:false } )
    onApplyClick()
  }

  useEffect( () => {
     //const dom=$(refDom.current) //points to the container div of this component
     if (!m.jqCreated) {
       m.jqCreated=true
     }
     m.internalRerender=false //set after each rerender, no matter what
  });
  /*
  useEffect( () => {
    //const dom=$(refDom.current) //points to the container div of this component
    console.log(' 000000000>>> AgeRange mounting ! ')
    return ()=>{
       console.log(' xxxxxxxxx<<< AgeRange dismounting ! ')
    }
   }, []);
  */

  function onPreset(e, range) {
    if (range) updateRange(range)
  }

  function collapse() {
    const jc=$(refDom.current)
    jc.find('.age-panel').collapse('hide');
    jc.addClass('lg-collapsed');
  }

  function unCollapse() {
    const jc=$(refDom.current)
    const t=jc.find('.lg-title');
    if (t) {
        const p=jc.find('.age-panel')
        p.collapse('show')
        jc.removeClass('lg-collapsed')
    }
  }

  function toggleCollapse(e) {
    //const t=$(refDom.current).find('.lg-title')
    const t=$(refDom.current)
    //const p = t.closest('.lg-panel').find('.lg-lst')
    if(!t.hasClass('lg-collapsed')) collapse()
                 else unCollapse()
  }

  function sliderChange(v_min, v_max) {
    if (v_min>0.00) v_min=Math.round(v_min)
    if (v_max>0.00) v_max=Math.round(v_max)
    setRangeState({ ... refData.current.slState, vmin:v_min, vmax:v_max})
  }

  function toggleFetal(e) {
    const isFetal=e.target.checked; //checkbox assumed

    m.scale=isFetal ? fetalScale : fullScale
    m.mrange=[m.scale[0], m.scale[m.scale.length-1]]
    const values=isFetal? m.fetalSel : m.fullSel
    setRangeState( { fetal:isFetal, vmin:values[0], vmax:values[1] } )
  }

  function updateRange(r) {
    const slState=refData.current.slState
    if (slState.vmin!==r[0] || slState.vmax!==r[1]) {
      if (props.onChange) props.onChange(r)
      setRangeState({ fetal:slState.fetal, vmin:r[0], vmax:r[1]})
    }
  }

  function unsetTimeout() {
    if (m.inputTimeout) clearTimeout(m.inputTimeout)
    m.inputTimeout=null
  }

  function updateVMin(e, delay=1200) {
    if (e.inputType==="insertReplacementText") delay=0
    //assume this is up/down keys or mini-buttons
    unsetTimeout()
    m.inputTimeout=setTimeout(  ()=> {
      const slState=refData.current.slState
      const [rmin, rmax]=m.mrange
      let range=[slState.vmin, slState.vmax]
      let v=e.target.value.trim()
      if (v==='' || v==='-') {
        e.target.value=range[0]
        m.inputTimeout=null
        return
      }
      let iv = parseFloat(v).toFixed(0)
      if (iv.length>0 && iv!="NaN") {
        let nv=parseFloat(iv)
        if (nv>rmax) nv=rmax;
        if (nv>range[1]) nv=range[1];
        if (nv<rmin) nv=rmin;
        if (nv!==range[0]) {
          updateRange([nv, range[1]]);
        }
        if (nv!==parseFloat(v)) e.target.value=nv;
      } else
        e.target.value=range[0]
      m.inputTimeout=null
    } , delay )
  }

  function mapScale(v) {
    if (m.slState.fetal) {
      const lastv=fetalScale[fetalScale.length-1]
      return v==lastv ? 'birth': v
    }
    return v
  }

  function updateVMax(e, delay=1200) {
    if (e.inputType==="insertReplacementText")
       delay=0 //assume this is up/down keys or mini-buttons
    unsetTimeout()
    m.inputTimeout=setTimeout(  ()=> {
      const slState=refData.current.slState
      let range=[slState.vmin, slState.vmax]
      const [rmin, rmax]=m.mrange
      let v=e.target.value.trim()
      if (v==='' || v==='-') {
        e.target.value=range[1]
        m.inputTimeout=null
        return
      }
      let iv = parseFloat(v).toFixed(0)
      if (iv.length>0 && iv!="NaN") {
        let nv=parseFloat(iv)
        if (nv>rmax) nv=rmax
        if (nv<range[0]) nv=range[0]
        if (nv<rmin) nv=rmin
        if (nv!==range[1]) updateRange([range[0], nv]);
        if (nv!==parseFloat(v)) e.target.value=nv
      } else
        e.target.value=range[1]
      m.inputTimeout=null
    } , delay )
  }

function exitVMin(e) {
  updateVMin(e, 0)
}
function exitVMax(e) {
  updateVMax(e, 0)
}

function enterPress(e) {
  if (e.key.toLowerCase() === "enter") {
   if (e.target.id == "ivmin") updateVMin(e, 0)
          else updateVMax(e, 0)
    e.preventDefault();
  }
}

function onSelUndo() {
  const wasfetal = (m.appliedRange[1]<=0 &&  m.appliedRange[0]<=0)
  let pval=[m.appliedRange[0], m.appliedRange[1]]
  if (wasfetal) { //convert back to PCW
     pval[0]=Math.round(m.appliedRange[0]*52+40)
     pval[1]=Math.round(m.appliedRange[1]*52+40)
  }
  setRangeState({ vmin:pval[0], vmax:pval[1], fetal:wasfetal })
  //forceUpdate()
}

//this should update m data
//called before EVERY RENDER:
if (rangeRW) { //override applied data at EVERY render
  if (rangeRW.length==0) { //default state
     m.appliedRange=[fullAgeRange[0], fullAgeRange[1]]
  } else {
     m.appliedRange=[rangeRW[0], rangeRW[1]]
  }
}



if (!m.jqCreated || !m.internalRerender) {
     //console.log(" ####---- creating/resetting AgeRange component")
    // --- check values from props
    if (rangeRW) {
       rangeState.vmin=m.appliedRange[0]
       rangeState.vmax=m.appliedRange[1]
       rangeState.fetal=(rangeState.vmin<0 && rangeState.vmax<=0)
    } else { //use props, if any, to get the initial values to show
      rangeState.vmin=pdefnum(props.vmin, props.fetal ? fetalRange[0] : fullAgeRange[0])
      rangeState.vmax=pdefnum(props.vmax, props.fetal ? fetalRange[1] : fullAgeRange[1])
      if (props.fetal) {
         rangeState.fetal=true
      } else {
        rangeState.fetal= (rangeState.vmin<0 && rangeState.vmax<=0)
        }
    }
    //if (rangeState.vmin!==fullAgeRange[0] || rangeState.vmax!==fullAgeRange[1]) {
    m.currentRange=[rangeState.vmin, rangeState.vmax]
    if (rangeState.vmin<0 && rangeState.vmax<=0) { //raw values passed
     rangeState.fetal=true //convert to PCW for slider display
     let vmin=Math.round((rangeState.vmin * 52.0)+40)    //PCW = (age * 52) + 40
     let vmax=Math.round((rangeState.vmax * 52.0)+40)
     const fmin=fetalScale[0], fmax=fetalScale[fetalScale.length-1]
     if (vmin<fmin) vmin=fmin;
     if (vmin>fmax) vmin=fmax;
     if (vmax<fmin) vmax=fmin;
     if (vmax>fmax) vmax=fmax;
     rangeState.vmin=vmin
     rangeState.vmax=vmax
    }
    m.scale = rangeState.fetal ? fetalScale : fullScale
    m.mrange=[m.scale[0], m.scale[m.scale.length-1]]
    m.slState={ ... rangeState }
    m.renderKey=String(Date.now()).substring(4)
}

// these are updated before every render:
/*
if (rangeState.fetal) {
   m.fetalSel=[rangeState.vmin, rangeState.vmax]
   m.scale=fetalScale
} else {
   m.fullSel=[rangeState.vmin, rangeState.vmax]
   m.scale=fullScale
}
m.mrange=[m.scale[0], m.scale[m.scale.length-1]]
///^^^^ updated m data for slider rendering
*/
//-----------------------------------------

const showOnlyFilter=haveRangeFilter()
const showApply=(m.currentRange[0]!=m.appliedRange[0] || m.currentRange[1]!=m.appliedRange[1])
const showSelUndo=(showApply && m.appliedRange[0]!==fullAgeRange[0] && m.appliedRange[1]!==fullAgeRange[1])
let selRange = `${m.slState.vmin} - ${m.slState.vmax}`
if (m.slState.fetal) {
   selRange=(m.slState.vmin==fetalRange[0] && m.slState.vmax==fetalRange[1]) ? "fetal" :
    `fetal ${selRange}`
} else if (m.slState.vmin<0) {
     selRange = `fetal - ${m.slState.vmax}`
    }

//console.log(" ..... AgeRange rendering with fetal state=", m.slState.fetal," values:", m.slState.vmin, m.slState.vmax)
//console.log(" .....  applied range: ", m.appliedRange, "||  currentRange:", m.currentRange)

const caption=props.title || "Age range"
//key={m.renderKey}
//style={ showApply ? { display:"inline"} : { display: "none"}}
return (<div class="lg-panel" ref={refDom} style={{ width : (props.width ? props.width : "14rem") }}>
    <div class="lg-title d-flex align-items-center" style="min-height:24px !important;">
        <span onClick={props.notitleclick ? null : toggleCollapse}
                  class={props.notitleclick ? "" : "lg-clickable"}>{caption}</span>
         {/* <span class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="customSwitch1"
                      onClick={toggleEnable} />
            <label class="custom-control-label" for="customSwitch1" >&nbsp;&nbsp;&nbsp;&nbsp;</label>
           </span> */}
        <span class="float-right d-flex justify-content-center align-items-center">
             {/*
             <span class="btn-undo" onClick={onSelUndo} key={String(Date.now()-10).substring(4)}
                 style={ showSelUndo ? { display:"inline-block"} : { display: "none"}}><img class="btn-undo-icon" /></span>
             <span className="lg-apply" onClick={onApplyClick}
                   style={showApply ? "display:inline;" : "display:none"}>Apply</span>
                   */}
             <span class="btn-undo" onClick={onSelUndo} key={String(Date.now()-10).substring(4)}
                  style={ showSelUndo ? { display:"inline-block"} : { display: "none"}}><img class="btn-undo-icon" /></span>
             <span class="lg-apply" onClick={onApplyClick} key={String(Date.now()).substring(4)}
                 style={ { display: showApply ? "inline" : "none" } }>
                 Apply</span>
             <span className="coll-glyph" onClick={toggleCollapse}> </span>
        </span>
    </div> {/* title */}
    <div class="collapse show age-panel">
      <div class="age-padder d-flex justify-content-start align-items-center pt-1">

        <div class="custom-control custom-checkbox">
          <input type="checkbox" class="custom-control-input" id="swFetal" checked={m.slState.fetal} onClick={toggleFetal} />
          <label class={ m.slState.fetal ? "custom-control-label lb-fetal-ck" : "custom-control-label lb-fetal"} for="swFetal">
               fetal{m.slState.fetal? "" : "?"} </label>
        </div>
        <span class="flex-fill">
        { !m.slState.fetal &&
            <AgeRangePreset range={[16,64]} onClick={onPreset} text="16-64" /> }
        </span>
      </div>
      <div class="age-padder pt-0">
          <JRange onChange={sliderChange} width="180" scale={m.scale} showLabels={true}
            from={m.mrange[0]} to={m.mrange[1]} mapScale={mapScale} value={[m.slState.vmin, m.slState.vmax]} />
      </div>
      <div class="age-padder d-inline-flex align-items-center justify-content-center pl-4 pt-0" >
          <Input className="form-control-sm" id="ivmin" type="number" size="5" pattern="^-?[1-9]\d*$"
            onChange={updateVMin} onBlur={exitVMin} onKeyDown={enterPress} min={m.mrange[0]} max={m.mrange[1]} value={m.slState.vmin} />
          <span class="age-spacer"> .. </span>
          <Input className="form-control-sm" id="ivmax" type="number" size="5" pattern="^\.-?[1-9]\d*$"
            onChange={updateVMax} onBlur={exitVMax} onKeyDown={enterPress} min={m.mrange[0]} max={m.mrange[1]} value={m.slState.vmax} />
          <div class="age-label"> { m.slState.fetal ? 'PCW':'years'} </div>
      </div>
    </div>
    { showOnlyFilter && <div className="lg-only">
        <span class="lg-only-lb" onClick={onOnlyClick}>&#x2715;</span>
        <span class="lg-only-item" onClick={onOnlyClick}>{selRange}</span>
        </div> }
  </div>)
}