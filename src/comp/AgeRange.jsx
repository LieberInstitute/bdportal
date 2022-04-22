import $ from "jquery";
import {useEffect, useState, useRef, useReducer} from "preact/hooks"
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'
import './ui.css'
import {JRange} from './JRange'


function pdef(v, def) { return (typeof v === 'undefined' ? def : v)}
function pdefbool(v, def) {
  if (typeof v === 'undefined') return def
  return (v=="yes" || v==1)
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

export function AgeRange( props ) {
  //if fetal is true, the range slider shows PCW (scale 0-42)
  // otherwise post-natal age is shown in years: 0-120

  //const [sliderState, _setSliderState]=useState({disabled:!pdefbool(props.enabled, false), fetal:pdefbool(props.fetal, false),
  const [rangeState, _setRangeState]=useState({ fetal:pdefbool(props.fetal, false),
                    from:pdef(props.min, -1), to:pdef(props.max, 120), vmin:pdef(props.vmin, pdef(props.min, -1)),
                      vmax:pdef(props.vmax, pdef(props.max, 120))})
  const fetalScale=[0, 10, 20, 30, 40] //PCW = (age * 52) + 40   where age<0
  const allScale=[fullAgeRange[0], 15, 30, 45, 60, 75, 90, 105, fullAgeRange[1]] //post-natal, regular age scale

  
  const fetalRange=[fetalScale[0], fetalScale[fetalScale.length-1]]

  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  //caret-left-fill icon
  const arrowLeft=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-left-fill" viewBox="0 0 16 16">
   <path d="M3.86 8.753l5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"/> </svg>`;
  //carret-down-fill
  const arrowDown=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-fill" viewBox="0 0 16 16">
   <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/> </svg>`;

  const refDom = useRef(null) //reference to container DOM
  
  const refData = useRef({ //also keep track of last setting when toggling fetal
    fetalSel: [0, 40],
    regSel: [-1,120],
    scale: allScale,
    from_to:[-1, 120],
    slState: rangeState, //keeps track of sliderState
    jqCreated: false,
    currentRange: [fullAgeRange[0], fullAgeRange[1]], //vmin, vmax : user selected range (PCW-free)
    appliedRange: [fullAgeRange[0], fullAgeRange[1]], //vmin, vmax : last applied range (PCW-free)
    btnApply: null,
    inputTimeout:null
  })

  const m=refData.current //convenience access

  function setRangeState(newSlState) {
      const sliderChanged = (m.slState.vmin!=newSlState.vmin ||  m.slState.vmax!=newSlState.vmax ||
                            m.slState.fetal!=newSlState.fetal)
      m.slState = newSlState
      if (sliderChanged) {
        const _vmin=  newSlState.fetal ? parseFloat(parseFloat((newSlState.vmin-40)/52).toFixed(2)) : newSlState.vmin
        const _vmax=  newSlState.fetal ? parseFloat(parseFloat((newSlState.vmax-40)/52).toFixed(2)) : newSlState.vmax        
        if (props.onChange) props.onChange(_vmin, _vmax)
        m.currentRange[0]=_vmin;
        m.currentRange[1]=_vmax;
        /*
        if (m.currentRange[0]!==m.appliedRange[0] || m.currentRange[1]!==m.appliedRange[1]) 
           rangeChanged()
           */
      }
      _setRangeState(newSlState)
  }
/*
  function rangeChanged() {
        m.btnApply.show()
  }
*/

  function updateRefData() {
      if (rangeState.fetal) {
      m.fetalSel=[rangeState.vmin, rangeState.vmax]
      m.scale=fetalScale
    }
    else {
      m.regSel=[rangeState.vmin, rangeState.vmax]
      m.scale=allScale
    }
    m.from_to=[m.scale[0], m.scale[m.scale.length-1]]
  }

  function rangeFilter() {
    return (m.currentRange[0]!=fullAgeRange[0] || m.currentRange[1]!=fullAgeRange[1])
  }
  function onApplyClick() {
      //actually apply the changes here --> trigger updateCounts()
      //
      //const btn=$(e.target)
      //btn.hide()
      //applyFilter() //onlyStates string is applied
      //e.stopPropagation()
    // --- this is how FltMList does it:
      //applyFilterData(fid, onlyData); //this updates counts, etc.
      m.appliedRange[0]=m.currentRange[0]
      m.appliedRange[1]=m.currentRange[1]
      //notifyUpdate(fid); 
      doCollapse(rangeFilter())
      if (props.onApply)
        props.onApply(m.appliedRange[0], m.appliedRange[1])
      forceUpdate() // tell React to update this component
  }

  function onOnlyClick(e) { // dismiss age range filter AND APPLY IT too!
    //clear filter
    m.currentRange[0]=fullAgeRange[0]
    m.currentRange[1]=fullAgeRange[1]
    setRangeState( { ... refData.current.slState,
      fetal:false, from:fullAgeRange[0], to:fullAgeRange[1], vmin:fullAgeRange[0], vmax:fullAgeRange[1] } )
    onApplyClick()
  }

  updateRefData();

  useEffect( () => { 
     
     const dom=$(refDom.current) //points to the container div of this component
     if (!m.jqCreated) {
       //first time rendering
       dom.find('.coll-glyph').html(arrowLeft)

       m.jqCreated=true
     }

  });

  function onPreset(e, range) {
    if (range) updateRange(range)
  }

 
  function doCollapse(collapse) { //doCollapse(false) will un-collapse!
    if (typeof collapse === 'undefined') collapse=true
    const t=$(refDom.current).find('.lg-title') 
    const isCollapsed=t.hasClass('lg-collapsed')
    if ((collapse && isCollapsed) || (!collapse && !isCollapsed)) return
    const p=t.closest('.lg-panel').find('.age-panel')
    if (collapse) {
      p.collapse('hide');
      t.addClass('lg-collapsed');
      t.find('.coll-glyph').html(arrowDown);
    } else { //un-collapse
      p.collapse('show');
      t.removeClass('lg-collapsed');
      t.find('.coll-glyph').html(arrowLeft)
    }

  }

  function toggleCollapse(e) {
    const t=$(e.target).closest('.lg-title') 
    const p=t.closest('.lg-panel').find('.age-panel')
    if(t.hasClass('lg-collapsed')) {
      p.collapse('show');
      t.removeClass('lg-collapsed');
      t.find('.coll-glyph').html(arrowLeft)
    } else { //collapse
      p.collapse('hide');
      t.addClass('lg-collapsed');
      t.find('.coll-glyph').html(arrowDown);
    }
  }
  /*
  function toggleEnable(e) { //by checkbox switch      
    const slState=refData.current.slState
    setSliderState({ ...slState, disabled:!e.target.checked})
  }*/

  function sliderChange(v_min, v_max) {
    if (v_min>0.00) v_min=Math.round(v_min)
    if (v_max>0.00) v_max=Math.round(v_max)
    setRangeState({ ... refData.current.slState, vmin:v_min, vmax:v_max})
  }

  function toggleFetal(e) {
    const isFetal=e.target.checked; //checkbox assumed
    m.scale=isFetal ? fetalScale : allScale
    m.from_to=[m.scale[0], m.scale[m.scale.length-1]]
    const values=isFetal? m.fetalSel : m.regSel
    setRangeState( { ... refData.current.slState,
      fetal:isFetal, from:m.from_to[0], to:m.from_to[1], vmin:values[0], vmax:values[1] } )
  }

  function updateRange(r) {
    const slState=refData.current.slState
    if (slState.vmin!==r[0] || slState.vmax!==r[1]) {
      if (props.onChange) props.onChange(r)
      setRangeState({...slState, vmin:r[0], vmax:r[1]})
    }
  }

  function unsetTimeout() {
    if (m.inputTimeout) clearTimeout(m.inputTimeout)
    m.inputTimeout=null
  }

  function updateVMin(e, delay=1200) {
    if (e.inputType==="insertReplacementText")
      delay=0 //assume this is up/down keys or mini-buttons
    unsetTimeout()
    m.inputTimeout=setTimeout(  ()=> {
      const slState=refData.current.slState
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
        if (nv>slState.to) nv=slState.vmax;
        if (nv>range[1]) nv=range[1];
        if (nv<slState.from) nv=slState.from;
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
      let v=e.target.value.trim()
      if (v==='' || v==='-') {
        e.target.value=range[1]
        m.inputTimeout=null
        return
      }
      let iv = parseFloat(v).toFixed(0)
      if (iv.length>0 && iv!="NaN") {
        let nv=parseFloat(iv)
        if (nv>slState.to) nv=slState.to
        if (nv<range[0]) nv=range[0]
        if (nv<slState.from) nv=slState.from
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
  setRangeState({ ... refData.current.slState, fetal:wasfetal, vmin:pval[0], vmax:pval[1],
     from:(wasfetal?fetalRange[0]:fullAgeRange[0]), to: (wasfetal?fetalRange[1]:fullAgeRange[1]) })
  //forceUpdate()
}

const showOnlyFilter=rangeFilter()
const showApply=(m.currentRange[0]!=m.appliedRange[0] || m.currentRange[1]!=m.appliedRange[1])
const showSelUndo=(showApply && m.appliedRange[0]!==fullAgeRange[0] && m.appliedRange[1]!==fullAgeRange[1])
let selRange = `${rangeState.vmin} - ${rangeState.vmax}`
if (rangeState.fetal) {
   selRange=(rangeState.vmin==fetalRange[0] && rangeState.vmax==fetalRange[1]) ? "fetal" :
    `fetal ${selRange}`
} else if (rangeState.vmin<0) {
     selRange = `fetal - ${rangeState.vmax}`
    }

//console.log(" ..... rendering with fetal state=", rangeState.fetal," m.from to =", rangeState.from, rangeState.to)

return (<div class="lg-panel" ref={refDom} style="width:14rem;">
    <div class="lg-title" >
        <span onClick={toggleCollapse} class="lg-clickable"> Age range </span>
        {/*         
          <span class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="customSwitch1"
                      onClick={toggleEnable} />
            <label class="custom-control-label" for="customSwitch1" >&nbsp;&nbsp;&nbsp;&nbsp;</label>
          </span>
        */}
        <span>
             <span class="btn-undo" onClick={onSelUndo} key={String(Date.now()-10).substring(4)} 
                 style={ showSelUndo ? { display:"inline-block"} : { display: "none"}}><img class="btn-undo-icon" /></span>
             <span className="lg-apply" onClick={onApplyClick} 
                   style={showApply ? "display:inline;" : "display:none"}>Apply</span>
             <span className="coll-glyph" onClick={toggleCollapse}> </span>
        </span>
    </div> {/* title */}
    <div class="collapse show age-panel">
      <div class="age-padder d-flex justify-content-start">
        
        <div class="custom-control custom-checkbox">
          <input type="checkbox" class="custom-control-input" key={String(Date.now()).substring(4)} id="swFetal" checked={rangeState.fetal} onClick={toggleFetal} />
          <label class={ rangeState.fetal ? "custom-control-label lb-fetal-ck" : "custom-control-label lb-fetal"} for="swFetal">fetal </label>
        </div>
        <span class="flex-fill">
        { !rangeState.fetal && 
            <AgeRangePreset range={[16,64]} onClick={onPreset} text="16-64" /> }
        { !rangeState.fetal && 
            <AgeRangePreset range={[65,120]} onClick={onPreset} text="65+" /> }
        </span>
      </div>
      <div class="age-padder">
          <JRange onChange={sliderChange} width="180" scale={m.scale} showLabels={true} 
            from={rangeState.from} to={rangeState.to} mapScale={mapScale} value={[rangeState.vmin, rangeState.vmax]} />
      </div>
      <div class="age-padder d-inline-flex align-items-center">
          <Input className="form-control-sm" id="ivmin" type="number" size="5" pattern="^-?[1-9]\d*$"
            onChange={updateVMin} onBlur={exitVMin} onKeyDown={enterPress} min={rangeState.from} max={rangeState.to} value={rangeState.vmin} />
          <span class="age-spacer"> .. </span>
          <Input className="form-control-sm" id="ivmax" type="number" size="5" pattern="^\.-?[1-9]\d*$"
            onChange={updateVMax} onBlur={exitVMax} onKeyDown={enterPress} min={rangeState.from} max={rangeState.to} value={rangeState.vmax} />
          <div class="age-label"> { rangeState.fetal ? 'PCW':'years'} </div>
      </div>
    </div>
    {showOnlyFilter && <div className="lg-only">
        <span class="lg-only-lb" onClick={onOnlyClick}>only</span>
        <span class="lg-only-item">{selRange}</span>
      </div>}
  </div>)
}