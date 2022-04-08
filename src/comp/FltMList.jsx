import $ from 'jquery'
import {useEffect, useRef, useState, useReducer } from 'preact/hooks'
import './ui.css'
import {arrowLeft, arrowDown, lockIcon} from './ui.jsx'
import './FltMList.css'
/* Core functionality props:
   data = function or object that provides the items with ids and counts
          ATTN: every re-render will reload these data
   filter = reference to a Set() holding selected item indexes
          ATTN: when provided, every re-render will override internal selection state
   onApply= event handler to notify parent when a new filter is applied
        params: ( selIdxArray, [ fid ] )
        ATTN: this also triggers a re-render so if props.filter was given,
              is should be updated with the applied selection!
   updateFilter="yes/1/true" -- updates the Set given at props.filter when user selection
                         is applied
 Esthetics:
   noBars : if provided, will disable display of bars for each item

*/

// add more elements here if needed:
const id2name = { dx : "Diagnosis", age: "Age", race: "Ancestry",
    reg : "Brain region", sex: "Sex" , dset: " D a t a s e t s",
    proto : "Protocol", pub : "Public" };


//filtering multi-select list component
//props = { id, type, width, height, horiz, showZero, nocollapse, data, filter, onApply}

/* props.getData should be or return an array of
   [ itemLabel, itemBadgeValue, lockStatus, item_index, itemOrigCounts, tooltip_fullname ]
  is 2nd param is given to , the list should have only items with itemOrigCounts > 0
*/

//------------ utility functions which should be in a commonly sourced file
// (works for array equality as well)
function objEq(a, b) {
  if (Object.keys(a).length!==Object.keys(b).length) return false
  for (let k in a)
    if (a[k]!==b[k]) return false
  return true
}

function objEqSet(o, set) { // set MUST be a Set() object
  if (Object.keys(o).length!==set.size) return false
  for (let k in o)
    if (!set.has(k)) return false
  return true
}

// NOTE: Object.keys() ALWAYS returns a string array
// convert keys() object to a numeric array SORTED increasingly
function keysToNumArr(o) {
    return Object.keys(o).map(Number).sort( (a,b) => a-b )
}

export function FltMList( props ) {
  // these should persist between re-renders
  const refDom = useRef(null) //reference to container DOM
  const refData = useRef({           //    0       1         2          3         4         5
    fltData:[], //list data: array of [label, xcount, public(1/2), origIdx, oriCount, fullname]
    onlyStates:{}, //hash set with only selected item indexes (selected origIdx )
    appliedStates:{}, //appliedStates - string map last applied
    idMap:{}, //mapping origIdx to its row index in current fltData
    jqCreated: false,
    applyRender:false, // transitional state, set only for the render after Apply
    btnApply: null,
    btnUndo: null,
    lHeight: 0 //calculated list height
    //fltSet: null //internal copy of the filter set
  });
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  //const [selStates, setSelStates]=useState('') //mirrors onlyStates
  const m=refData.current
  /*
  const onlyData=flDt.current.onlyDt; //array with only selected item indexes
  const onlyStates=flDt.current.onlySt; //changing/current selected states
  const appliedStates=flDt.current.appSt; // selected set as last applied
  const jqCreated=flDt.current.jqCr;
  const btnApply=flDt.current.btnApp;
  const idMap=flDt.current.idMap; //mapping original dtNames index to fltDta index
  const fltData=flDt.current.fltDta;
  */
  const fid=props.id; // id must be one of the recognized ones in id2name !
  const isToggle=(props.type==='toggle' || props.type==='htoggle');
  const showZero=props.showZero;

  // if a filter was given, it's the parent responsibility to keep it updated after onApply!
  // when dtFilter, the object will render selection according to this filter
  const dtFilter=props.filter /* ? props.filter : new Set()
  m.fltSet=dtFilter */
  const isHoriz=(props.type==='htoggle' || props.horiz==='1')
  const noCollapse=(isToggle || typeof props.nocollapse != "undefined" || 
          typeof props.noCollapse != "undefined") // toggle styles are never collapsible
  //WARN: when props.data is a function, that is going to be called by EVERY UPDATE
  // better make it an object updated by the parent only when needed
  const gotFltData=props.data ? ( (typeof props.data === 'function') ? props.data(fid, showZero) :
        props.data)  :    [ ['Item-one' , 101, 2, 15, 1000, 'This is item-1'],
                            ['Item-two'  , 202, 1, 42, 2000, 'This is item-2'],
                            ['Item-three', 303, 2, 33, 3000, 'This is item-3'],
                            ['Item-four' , 404, 2, 14, 4000, 'This is item-4'],
                            ['Item-five' , 508, 2, 52, 5000, 'This is item-5'],
                            ['Item-six',   803, 1, 83, 3000, 'This is item-6'],
                            ['Item-seven', 704, 2, 74, 4000, 'This is item-7'],
                            ['Item-eight', 608, 2, 62, 5000, 'This is item-8']
                                                      ];
  //const itemsChanged = (m.fltData.length && oriCountsDiffer(gotFltData, m.fltData));
  if (gotFltData.length>0) { // make an internal copy for every render?
       // update fltData for each render:
      m.fltData.length=gotFltData.length;
      let maxv=0;
      gotFltData.forEach( (d,i)=>{
             //fltData.push(e);
             m.fltData[i]=d;; //dtaNames index (id)-1 -> fltData index
             if (d[1]>maxv) maxv=d[1];
      })
      m.fltData.sort( (a, b)=> b[1]-a[1])
      m.fltData.forEach( (d,i)=>{ 
        m.idMap[d[3]]=i
        d[6]=Math.round(d[1]*100/maxv)  
      })
  }

  if (dtFilter && m.applyRender) { // && dtFilter.size>0 ?
      // when props.filter is given, this will override the current onlyStates and appliedStates!
      // in order to avoid this, any re-render should ONLY happen after
      // onApplyClick() updated the filter data backend (props.filter and props.data)
      //console.log(" -- dtFilter given:", dtFilter, ", overriding selection", m.onlyStates)
      m.applyRender=false
      m.onlyStates={} // or for (const k in m.onlyStates) delete m.onlyStates[k]
      dtFilter.forEach( e => m.onlyStates[e]=1 )
      m.appliedStates=Object.assign({}, m.onlyStates)
      //now this update should take care of showing the right filter selection
  }

  useEffect(()=> {
      if (m.fltData.length===0) {
        return;
      }
      const dom=$(refDom.current)
      if (!m.jqCreated) {
        firstRender(dom) //, notifyUpdate);
        m.jqCreated=true;
      }
      m.btnApply = dom.find('.lg-apply')
      m.btnUndo = dom.find('.btn-undo')
      //console.log(`FltMList ${fid} creating with filter size: ${dtFilter.size}`);
      //dom.find('.coll-glyph').html(arrowLeft)
      if (!isToggle) {
        // add scrolling, collapse and apply click handlers
        //if (dtFilter.size===0) unCollapse(dom);
        const li=dom.find('.lg-item').last();
        // after every render:
        if (li && li.position) {
          m.lHeight=Math.floor(li.position().top+li.outerHeight(true));
          const jscroller=dom.find(' .lg-scroller');
          scrollShader(jscroller, m.lHeight);
          jscroller.off('scroll')
          jscroller.on('scroll', (e) => scrollShader($(e.target), m.lHeight) );
          //if (noCollapse) return;
        }
        showOnlyItems()
      }

  }) // useEffect after every render

   function updateFromFilter() { //this should not be needed
     if (dtFilter) {
       m.onlyStates={} // or for (const k in m.onlyStates) delete m.onlyStates[k]
       dtFilter.forEach( e => m.onlyStates[e]=1 )
       m.appliedStates=Object.assign({}, m.onlyStates)
       forceUpdate()
     }
   }

  function applyFilter(noupdate) {
    if (Object.keys(m.onlyStates).length===m.fltData.length) {
        //the silly case when all items are selected!
        m.onlyStates={}
    }
    m.appliedStates=Object.assign({}, m.onlyStates)
    if (props.onApply) {
      props.onApply(m.onlyStates, fid)
    }
    if (props.filter && props.updateFilter) { //auto-update of filter Set requested
      const fSet=props.filter
      fSet.clear()
      Object.keys(m.onlyStates).map(Number).forEach( k => fSet.add(k) )
    }
    if (noupdate) return
    forceUpdate() //trigger an update
    //notifyUpdate(fid); //broadcast the new counts update to other components
  }

  function filterChanged() { //show the apply button
      if (Object.keys(m.appliedStates).length===0 &&
          (Object.keys(m.onlyStates).length===m.fltData.length)) {
            //deal with the silly case when all items are selected!
            return false;
      }
      return (!objEq(m.appliedStates, m.onlyStates))
  }

  function onOnlyClick() { //also applies the filter!
    deselectAll(true)
    onApplyClick()
  }

  function deselectAll(noupd) {
    m.onlyStates={}
    if (noupd) return
    //showOnlyItems()
    unCollapse()
    forceUpdate()
    //setSelStates(m.onlyStates)
  }

  function showOnlyItems() {
    const ol=$(refDom.current).find('.lg-only')
    ol.hide()
    let oitems=ol.find('.lg-only-item')
    oitems.off('click')
    oitems.remove()
    if (Object.keys(m.onlyStates).length) {
        ol.append(
          Object.keys(m.onlyStates).map( k=>Number(m.idMap[k]) ).sort((a,b)=>a-b).map(
            k => `<span class="lg-only-item" key=${k} id="o${m.fltData[k][3]}">${m.fltData[k][0]}</span>`
          ))
        ol.show()
        oitems=ol.find('.lg-only-item')
        oitems.on('click', e=>{
          if (!e.target.id || e.target.id.length<2) return
          const id=Number(e.target.id.substring(1))
          //console.log(" id=", id, " list idx:", m.idMap[id])
          const t=$(e.target).closest('.lg-panel').find('.lg-item')[m.idMap[id]]
          unselectItem($(t), id)

        })
    }

    
  }

  function showApplyButton() {
    const ch=filterChanged()
    const undo=(ch && Object.keys(m.appliedStates).length>0)
    if (ch) {
      if (undo) m.btnUndo.show()
      else m.btnUndo.hide()
      m.btnApply.show()
    } 
     else {
       m.btnUndo.hide()
       m.btnApply.hide()
     }
  }

  function selectItem(t, id) {
    t.addClass('lg-sel')
    m.onlyStates[id]=1
    showOnlyItems()
    showApplyButton()
  }

  function unselectItem(t, id) {
   t.removeClass('lg-sel')
   delete m.onlyStates[id]
   showOnlyItems()
   showApplyButton()
  }

  function onClickList(e) {
    let t=$(e.target)
    e.preventDefault()
    if (!t.hasClass('lg-item')) {
      t=t.closest('.lg-item')
      if (t.length==0) return
    }
    const id=parseInt(t[0].id)
    if (isNaN(id)) return
    if (m.onlyStates[id]) unselectItem(t, id);
                  else    selectItem(t, id);
  }


  function unCollapse() {
    const jc=$(refDom.current)
    const t=jc.find('.lg-title');
    if (t) {
        const p=jc.find('.lg-lst')
        p.collapse('show')
        t.removeClass('lg-collapsed');
        scrollShader(p, m.lHeight);
        //scrollShader(p, lh);
        t.find('.coll-glyph').html(arrowLeft)
    }
  }

  function collapse() {
    const jc=$(refDom.current)
    const t=jc.find('.lg-title');
    jc.find('.lg-lst').collapse('hide');
    t.addClass('lg-collapsed');
    t.find('.coll-glyph').html(arrowDown);
  }

  function onApplyClick() { //when clicking the Apply button
      m.applyRender=true //next render was triggered by this apply action
      applyFilter() //onlyStates string is applied, call props.onApply() handler
      if (isToggle) return
      if (Object.keys(m.onlyStates).length>0)
              collapse()
         else unCollapse()
  }

  function onSelUndo() {
    m.onlyStates=Object.assign({}, m.appliedStates)
    forceUpdate()
  }

  function toggleCollapse(e) {
    const t=$(refDom.current).find('.lg-title')
    //const p = t.closest('.lg-panel').find('.lg-lst')
    if(!t.hasClass('lg-collapsed')) collapse()
                 else unCollapse()
  }

  function firstRender(dom) {
    //first time rendering
    if (!isToggle)
      dom.find('.coll-glyph').html(arrowLeft);
    /* if (id==='sex') {
      jc.css("line-height","1rem");
      jc.find('.lg-title').css("line-height","1rem");
      jc.css("font-size","90%");
    } */
    if (fid==='proto') {
      dom.css("font-size","84%");
      dom.css("line-height","1rem");
      let jt=dom.find('.lg-title');
      jt.css("line-height","1.2rem");
      jt.css("font-size", "110%")
    }

    if (fid==='dset') {
      dom.find('.lg-title').css("text-align","center");
      dom.find('.lg-title').css("color","#dd1848");
    }

    return dom;
  }

  function scrollShader(t, lh) {
    const y = t.scrollTop();
    const l = t.closest('.lg-panel').find('.lg-lst');
    if (y>2) {
      //p.addClass('lg-b-shadow');
      l.find('.lg-topshade').show();
    }
    else {
      //p.removeClass('lg-b-shadow');
      l.find('.lg-topshade').hide();
    }
    //console.log(`y=${y}+${t.innerHeight()} >= ? ${lh}`);
    if (y+t.innerHeight()>=lh) {
      //t.removeClass('lg-in-shadow');
      l.find('.lg-bottomshade').hide();
    } else {
      //t.addClass('lg-in-shadow');
      l.find('.lg-bottomshade').show();
    }
  }

  function isSel(oid) {
    return (m.onlyStates[oid]>0) ? 'lg-sel' : ''
  }

  function lockStatus(pd) {
    if (!pd) return null;
    return (pd===1) ? <span class="lg-item-lock"> </span> :
                      <span class="lg-item-pub"> </span>    
  }

  function renderItems() {
    const showBars = typeof props.noBars == 'undefined' || 
                  typeof props.nobars == 'undefined'
    return (m.fltData.map( (d)=>{
      return (<li class={`d-flex justify-content-between lg-item ${isSel(d[3])}`}
        id={d[3]} key={`${d[3]}_${String(Date.now()).substring(4)}`}>
      <span class="lg-item-th">{lockStatus(d[2])}{d[0]}</span>
      <span class="lg-item-counts" >
        { showBars &&  <span class="lg-item-bar"> <span class="lg-item-bar-v"
             style={ {width: `${d[6]}%` }} > </span> </span>
        }
        <span class={`badge-primary badge-pill lg-count ${d[1]===0?"lg-count-0":""}`}>{d[1]}</span>
      </span>
      </li>) } ))
  }

  let addclass=props.class ? `lg-panel ${props.class}` : "lg-panel"

  const showOnly = (!isToggle && Object.keys(m.onlyStates).length>0)
  const showApply=filterChanged()
  const showSelUndo=(showApply && Object.keys(m.appliedStates).length>0)
  // --- render FltMList ---
  //console.log(">>>>>- rendering| onlyStates:", Object.keys(m.onlyStates),
  //   "  applied:", Object.keys(m.appliedStates), " showApply:", showApply)

  // ################## rendering component here:
  return (
       <div className={addclass} ref={refDom} id={props.id} style={{ width : (props.width ? props.width : "auto") }}>
        <div className="lg-title"><span onClick={noCollapse ? null : toggleCollapse} class={noCollapse ? "" : "lg-clickable" }>
          {id2name[props.id] || props.id}</span>
           <span className="float-right">
             <span class="btn-undo" onClick={onSelUndo} key={String(Date.now()-10).substring(4)} style={ showSelUndo ? { display:"inline-block"} : { display: "none"}}><img class="btn-undo-icon" /></span>
             <span class="lg-apply" onClick={onApplyClick} key={String(Date.now()).substring(4)} style={ showApply ? { display:"inline-block"} : { display: "none"}}>
                 Apply</span>
             { !noCollapse &&
                 <span className="coll-glyph" onClick={toggleCollapse}> </span>
             }
           </span>
        </div>
          { isToggle ? <ul className="lg-toggler" onClick={onClickList}> {renderItems()} </ul>
          :
          <ul className="collapse show lg-lst" onClick={onClickList}>
           <div className="lg-scroller" style={{ maxHeight : props.height ? props.height  : "8.6rem"}}>
              {renderItems()}
           </div>
           <div className="lg-topshade"> </div>
           <div className="lg-bottomshade"> </div>
          </ul> }
        <div className="lg-only" key={String(Date.now()).substring(4)} style={showOnly ? "display:block;" : "display:none;"}>
           <span class="lg-only-lb" onClick={onOnlyClick}>only</span>

        </div>
       </div>
     )
}



