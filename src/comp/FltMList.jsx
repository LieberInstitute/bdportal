import $ from 'jquery'
import {useEffect, useRef, useState, useReducer } from 'preact/hooks'
import './ui.css'
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
 Esthetics/basic func:
   height, width : override
   toggle, htoggle, faketoggle : make it a toggle-type list, with no footer section
                              (only htoggle arranges items horizontally)
                      faketoggle is a quasi-toggle that still allows multi-item selection with ctrl+click!
   horiz : show items in a horizontal list (impractical for more than a few items)
   title : provide a different title caption than the id of the component
   sort : if present, sort decreasingly by counts
   notitleclick : if present, click on title caption does not collapse (for collapsible)
   nocollapse: prevent collapsing, hide collapse icon
   nobars : if provided, disable display of count bars for each item

 Special case: ageRange prop can be used with an 'age' panel to show 'ageRange'
    when there is no age bin selection but ageRange is set.
    This makes the component "read-only" except for the "dismiss/clear" button
    which allows the user to clear that age range and resume age bin selection

 CSS classes:
   class="fl-shad"      : floating panels with shadow
   class="fl-inset"     : inset panels, no shadow, flat title
   class = "lg-shrink"  : smaller item fonts (e.g. for protocol toggler)

*/

// add more elements here if needed:
const id2name = { dx : "Diagnosis", age: "Age", race: "Ancestry",
    reg : "Brain region", sex: "Sex" , dset: " Datasets ",
    proto : "Protocol", pub : "Public" };

//filtering multi-select list component
//props = { id, type, width, height, horiz, toggle, htoggle, nocollapse, data, filter, onApply}

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
    btnApply: null,
    btnUndo: null,
    lHeight: 0 //calculated list height
    //fltSet: null //internal copy of the filter set
  });
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  //const [selStates, setSelStates]=useState('') //mirrors onlyStates
  const m=refData.current

  const fid=props.id; // id must be one of the recognized ones in id2name !
  const isToggle=(props.type && props.type.indexOf('toggle')>=0);
  const fakeToggle=(props.type=='ftoggle' || props.type=='faketoggle')

  // if a filter was given, it's the parent responsibility to keep it updated after onApply!
  // when dtFilter, the object will render selection according to this filter
  const dtFilter= (typeof props.filter === 'function' ) ? props.filter(fid) : props.filter
    /* ? props.filter : new Set()
    m.fltSet=dtFilter */
  const isHoriz=(props.type==='htoggle' || props.horiz)
  const noCollapse=(isToggle || typeof props.nocollapse != "undefined" ||
          typeof props.noCollapse != "undefined") // toggle styles are never collapsible
  //WARN: when props.data is a function, that is going to be called by EVERY UPDATE
  // better make it an object updated by the parent only when needed

  const gotFltData=props.data ? ( (typeof props.data === 'function') ? props.data(fid) :
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
             m.fltData[i]=d; //dtaNames index (id)-1 -> fltData index
             if (d[1]>maxv) maxv=d[1];
      })
      if (props.sort) { //sort by
         m.fltData.sort( (a, b)=> b[1]-a[1])
      }
      m.fltData.forEach( (d,i)=>{
        m.idMap[d[3]]=i
        d[6]=Math.round(d[1]*100/maxv)
      })
  }

  if (dtFilter) { // && dtFilter.size>0 ?
      // when props.filter is given, this will override the current onlyStates and appliedStates!
      // in order to avoid this, any re-render should ONLY happen after
      // onApplyClick() updated the filter data backend (props.filter and props.data)
      m.onlyStates={} // or for (const k in m.onlyStates) delete m.onlyStates[k]
      dtFilter.forEach( e => m.onlyStates[e]=1 )
      m.appliedStates=Object.assign({}, m.onlyStates)
      //now this update should take care of showing the right filter selection
  }

  const showAgeRange=(fid=='age' && props.ageRange && props.ageRange.length===2)
  useEffect(()=> {
      if (m.fltData.length===0) {
        return;
      }
      const dom=$(refDom.current)
      if (!m.jqCreated) {
        //firstRender(dom)
        m.jqCreated=true;
      }
      //-- do I need this for every render?
      firstRender(dom) //, notifyUpdate);
      m.btnApply = dom.find('.lg-apply')
      m.btnUndo = dom.find('.btn-undo')
      //console.log(`FltMList ${fid} creating with filter size: ${dtFilter.size}`);
      //dom.find('.coll-glyph').html(arrowLeft)
      if (!isToggle) {
        // add scrolling shading
        //if (dtFilter.size===0) unCollapse(dom);
        // after every render:
        //if (li && li.position) {
          //m.lHeight=Math.round(li.position().top+li.outerHeight(true))
          const jscroller=dom.find('.lg-scroller')
          checkScrollShader(jscroller)
          //if (noCollapse) return;
        //}
        showOnlyItems()
       // -- uncollapse if no selection
        if (Object.keys(m.onlyStates).length===0)
           unCollapse()
      }

  }) // useEffect after every render
  /*
  useEffect( () => {
    //const dom=$(refDom.current) //points to the container div of this component
     if (fid==='dx')
      console.log(' 000000000>>> Dx FltMList mounting ! ')
    return ()=>{
      if (fid==='dx')
       console.log(' xxxxxxxxx<<< Dx FltMList dismounting ! ')
    }
  }, []); */


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
    if (dtFilter && props.updateFilter) { //auto-update of filter Set requested
      dtFilter.clear()
      Object.keys(m.onlyStates).map(Number).forEach( k => dtFilter.add(k) )
    }
    //note that the onApply() callback is called AFTER the filter was updated
    if (props.onApply) {
      props.onApply(m.onlyStates, fid)
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
    if (showAgeRange) {
      props.ageRange.length=0
    }
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
          applyFilter()
        })
    } else if (showAgeRange) {
         let [amin, amax]=props.ageRange
         let pre=""
         if (amin<0 && amax<0) {
          amin=Math.round(amin*52+40)
          amax=Math.round(amax*52+40)
          pre= "PCW"
         }
         ol.append(`<span class="lg-only-item" key="ar" id="oar">${amin} - ${amax} ${pre}</span>`)
         ol.show()
         ol.find('.lg-only-item').on('click', () => { onOnlyClick() })
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

  function selectItem(t, id, ctrl) {
    const forbidMulti=(isToggle & !(fakeToggle && ctrl))
    if (forbidMulti)  { // deselect all!
       m.onlyStates={}
       t.siblings().removeClass('lg-sel')
    }
    t.addClass('lg-sel')
    m.onlyStates[id]=1
    if (!isToggle) showOnlyItems()
    showApplyButton()
  }

  function unselectItem(t, id) {
   t.removeClass('lg-sel')
   delete m.onlyStates[id]
   if (!isToggle) showOnlyItems()
   showApplyButton()
  }

  function onClickList(e) {
    let t=$(e.target)
    e.preventDefault()
    if (showAgeRange) { // or "frozen" due to a brList being applied?
      // disable interaction, show a toast/alert about it
      if (props.onNoClickInfo) props.onNoClickInfo(fid, 'age-range') //reason shown
      return
    }
    if (!t.hasClass('lg-item')) {
      t=t.closest('.lg-item')
      if (t.length==0) return
    }
    const id=parseInt(t[0].id)
    if (isNaN(id)) return
    if (m.onlyStates[id]) unselectItem(t, id);
                  else    {
                    selectItem(t, id, e.ctrlKey);
                    if (props.onClickItem) props.onClickItem(id, fid, Object.keys(m.onlyStates))
                  }
  }

  function checkScrollShader(jscroller) {
    m.lHeight=jscroller.get(0).scrollHeight
    const lh=Math.round(jscroller.height())
    //console.log(` scroller for ${fid}: `, m.lHeight, ' vs' , lh)
    jscroller.off('scroll')
    scrollShader(jscroller, m.lHeight, lh);
    if (lh<m.lHeight)
      jscroller.on('scroll', (e) => scrollShader($(e.target), m.lHeight, lh)  );
  }

  function unCollapse() {
    if (isToggle) return
    const jc=$(refDom.current)
    const t=jc.find('.lg-title');
    if (t) {
        const p=jc.find('.lg-lst')
        p.collapse('show')
        jc.removeClass('lg-collapsed')
        if (m.lHeight<4)  //refresh scroll shader
            checkScrollShader(p.find('.lg-scroller'))
    }
  }

  function collapse() {
    if (isToggle) return
    const jc=$(refDom.current)
    jc.find('.lg-lst').collapse('hide');
    jc.addClass('lg-collapsed');
    //t.find('.coll-glyph').html(arrowDown);
  }

  function onApplyClick() { //when clicking the Apply button
      applyFilter() //onlyStates string is applied, call props.onApply() handler
      if (isToggle || noCollapse)  return

      if (Object.keys(m.onlyStates).length>0)
              collapse()
         else unCollapse()
  }

  function onSelUndo() {
    m.onlyStates=Object.assign({}, m.appliedStates)
    forceUpdate()
  }

  function toggleCollapse(e) {
    //const t=$(refDom.current).find('.lg-title')
    const t=$(refDom.current)
    //const p = t.closest('.lg-panel').find('.lg-lst')
    if(!t.hasClass('lg-collapsed')) collapse()
                 else unCollapse()
  }

  function firstRender(dom) {
    if (fid==='proto' && !isHoriz) {
      dom.find('.lg-item').css({ "font-size":"14px"})
      dom.find('.lg-count').css({ "font-size":"13px"})
      //dom.find('.lg-title').css({ "line-height":"1.2rem", "font-size":"110%"})
    }
   /*
    if (fid==='dset') {
      // dom.find('.lg-clickable').css({"text-align":"center", width:"70%", "padding-left":"6rem"});
      dom.find('.lg-title span').css({color:"#d01848", "text-align":"center"});
     } */


    return dom;
  }

  function scrollShader(t, lh, vh) {
    const y = t.scrollTop();
    const l = t.closest('.lg-panel').find('.lg-lst');
    if (y>1) {
      //p.addClass('lg-b-shadow');
      l.find('.lg-topshade').show();
    }
    else {
      //p.removeClass('lg-b-shadow');
      l.find('.lg-topshade').hide();
    }
   //console.log('y+vh=', y+vh, ' vs ', lh)
    if (y+vh>=lh) {
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
    const showBars = !isHoriz && (typeof props.nobars == 'undefined')
    //if (fid=="sex")
   //  console.log("renderItems() called with m.onlyStates=", Object.keys(m.onlyStates))
    return (m.fltData.map( (d)=>{
      return (<li class={`d-flex justify-content-between lg-item ${isHoriz?'lg-item-h':''} ${isSel(d[3])}`}
        id={d[3]} key={`${d[3]}_${String(Date.now()).substring(4)}`}>
      <span class="lg-item-th">{lockStatus(d[2])}{d[0]}</span>
      { isHoriz && <span class="lg-spacer"> </span>}
      <span class="lg-item-counts" >
        { showBars &&  <span class="lg-item-bar"> <span class="lg-item-bar-v"
             style={ {width: `${d[6]}%` }} > </span> </span>
        }
        <span class={`badge-primary badge-pill lg-count ${d[1]===0?"lg-count-0":""}`}>{d[1]}</span>
      </span>
      </li>) } ))
  }
  let addclass="noselect lg-panel"
  if (isToggle) addclass=`${addclass} lg-collapsed`
  if (props.class) addclass=`${addclass} ${props.class}`

  const showOnly = (!isToggle && (Object.keys(m.onlyStates).length>0 || showAgeRange))
  const showApply=filterChanged()
  //const showApply=true
  const showSelUndo=(showApply && Object.keys(m.appliedStates).length>0)
  //const showSelUndo=true
  // --- render FltMList ---
  //if (fid==='dx')
  //  console.log(">>>>>- rendering Dx FltMlist with onlyStates=", Object.keys(m.onlyStates))
  //console.log(">>>>>- rendering| onlyStates:", Object.keys(m.onlyStates), " isToggle:",isToggle, ", showOnly:", showOnly)
  //   "  applied:", Object.keys(m.appliedStates), " showApply:", showApply)

  // ################## rendering component here:
  const caption=id2name[props.id] || props.id
  const titleNoClick=( noCollapse || props.notitleclick )
  const titleClass= fid=='dset' ? "lg-title lg-dset-title" : "lg-title"
  const toggleClass = isHoriz ? "lg-toggler d-flex justify-content-around" :
                                "lg-toggler";
  return (
       <div class={addclass} ref={refDom} id={props.id} style={{ width : (props.width ? props.width : "auto") }}>
        <div class={titleClass}>
          <span onClick={titleNoClick ? null : toggleCollapse} class={titleNoClick ? "lg-tcaption" : "lg-tcaption lg-clickable" }>
          {caption}</span>
          <span class="float-right d-flex justify-content-center align-items-center">
             <span class="btn-undo" onClick={onSelUndo} key={String(Date.now()-10).substring(4)}
                  style={ showSelUndo ? { display:"inline-block"} : { display: "none"}}><img class="btn-undo-icon" /></span>
             <span class="lg-apply" onClick={onApplyClick} key={String(Date.now()).substring(4)}
                 style={ showApply ? { display:"inline"} : { display: "none"}}>
                 Apply</span>
             { !noCollapse &&
                 <span className="coll-glyph" onClick={toggleCollapse}> </span>
             }
           </span>
        </div>
          { isToggle ? <ul class={toggleClass} onClick={onClickList}
                       style={ fakeToggle ? { maxHeight : props.height ? props.height  : "8.6rem"}:{}}>
                  {renderItems()} </ul>
          :
          <ul class="collapse show lg-lst" onClick={onClickList}>
           <div class="lg-scroller" style={{ maxHeight : props.height ? props.height  : "8.6rem"}}>
              {renderItems()}
           </div>
           <div class="lg-topshade"> </div>
           <div class="lg-bottomshade"> </div>
          </ul> }
        <div class="lg-only" key={String(Date.now()).substring(4)} style={showOnly ? "display:block;" : "display:none;"}>
           <span class="lg-only-lb" onClick={onOnlyClick}>&#x2715;</span>

        </div>
       </div>
     )
}



