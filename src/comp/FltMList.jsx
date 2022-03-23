import $, { map } from 'jquery'
import {useEffect, useRef, useState } from 'preact/hooks'
import './FltMList.css'
import {  rGlobs, useRData, getFilterData, applyFilterData,
          useFltCtx, useFltCtxUpdate, dtFilters } from './RDataCtx';

//import Popper from 'popper.js';

const id2name = { dx : "Diagnosis", age: "Age", race: "Ancestry", reg : "Brain region",
          sex: "Sex" , dset: " D a t a s e t s", proto : "Protocol", pub : "Public" };

//return a string obtained by changing character at position i in s with c
function strPut(s, i, c) {
  i=parseInt(i,10);
  if (i>s.length-1 || i<0) return s;
  let r=s.substring(0, i).concat(c, s.substring(i+1));
  return r;
}
//caret-left-fill icon
const arrowLeft=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-left-fill" viewBox="0 0 16 16">
<path d="M3.86 8.753l5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"/>
</svg>`;
//carret-down-fill
const arrowDown=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-fill" viewBox="0 0 16 16">
  <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
</svg>`;
//caret-up (empty)
const arrowUp=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-up" viewBox="0 0 16 16">
<path d="M3.204 11h9.592L8 5.519 3.204 11zm-.753-.659l4.796-5.48a1 1 0 0 1 1.506 0l4.796 5.48c.566.647.106 1.659-.753 1.659H3.204a1 1 0 0 1-.753-1.659z"/>
</svg>`;
const lockIcon=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
<path d="M6 8v-2c0-3.313 2.687-6 6-6 3.312 0 6 2.687 6 6v2h-2v-2c0-2.206-1.795-4-4-4s-4 1.794-4 4v2h-2zm-3 2v14h18v-14h-18z"/>
</svg>`;

function oriCountsDiffer(a, b) { //returns true if any a[i][4]!==b[i][4]
  if (a.length!==b.length) return true;
  //  0       1       2           3         4
  //label, xcount, public(1/2), nameIdx, oriCount, fullname
  a.forEach( (e,i)=>{
    if (e[4]!==b[i][4]) return true;
  })
  return false;
}


//filtering multi-select list component 
//props = { id, type, width, height, horis, showZero, nocollapse}
function FltMList( props ) {
  // these should persist between re-renders
  const flDt = useRef({
    onlyDt:[], //onlyData
    onlySt:[''], //onlyStates
    appSt:[''], //appliedStates
    fltDta:[], //list of [label, xcount, public(1/2), nameIdx, oriCount, fullname]
    idMap:[], //mapping a dtaNames index to its list index in fltDta array
    jqCr: [false],
    btnApp: [null],
    lHeight: 0 //calculated list height
  });
  const onlyData=flDt.current.onlyDt; //array with only selected indexes
  const onlyStates=flDt.current.onlySt; //changing/current selected states
  const appliedStates=flDt.current.appSt; // selected set as last applied
  const jqCreated=flDt.current.jqCr;
  const btnApply=flDt.current.btnApp;
  const idMap=flDt.current.idMap; //mapping original index to list display index
  const fltData=flDt.current.fltDta;
                                        //     0        1         2
  const [xdata, countData, brCountData, dataLoaded] = useRData();

  //const [itemsChanged, setItemsChanged] = useState(false);

   //callback to use to inform other consumers of an applied filter:
  const notifyUpdate = useFltCtxUpdate(); 
  const [fltUpdId, fltFlip] = useFltCtx(); //external update, should update these counts
  //if (!rGlobs.dataLoaded) return;
  const fid=props.id;
  const isToggle=(props.type==='toggle' || props.type==='htoggle');
  const showZero=props.showZero;
  const isHoriz=(props.type==='htoggle' || props.horiz==='1');
  const noCollapse=(isToggle || props.nocollapse==="1"); // toggle styles are never collapsible
  //const lockData=props.lockData; //array of boolean values, showing locked items
  //const isFirstRender=useFirstRender();
  //const dataLoaded=rGlobs.dataLoaded;
  //const [fltNames, fltCounts, fltXCounts, fltPubStatus] = dataLoaded ? getFilterData(fid) : [null, null, null, null, null]; 
  const gotFltData=dataLoaded ? getFilterData(fid, showZero) : [];
  //   [ itemLabel, itemBadgeValue, lockStatus, dtaNames[fid] index, itemOrigCounts, tooltip_fullname ]
  const itemsChanged = (fltData.length && oriCountsDiffer(gotFltData, fltData));
  //    setItemsChanged(true)
  //if (fltNames) {  
  if (gotFltData.length>0) {
       // update fltData after each call obviously:
       fltData.length=gotFltData.length;
       gotFltData.forEach( (e,i)=>{
             //fltData.push(e);
             fltData[i]=e;
             idMap[e[3]]=i; //dtaNames index (id) -> fltData index
  });

  if (onlyStates[0].length===0) { //creation time 
      //fltNames.slice(1).forEach( ()  => onlyStates[0] += '0' );
      for (let i=0;i<idMap.length;i++) { onlyStates[0] += '0' }
      appliedStates[0]=onlyStates[0]; //states as last applied
      //console.log(`FltMList ${fid} creation..`);
    } 
  }

  useEffect(()=> {
      //if (fltData && fltData.length>0) console.log(`FltMList useEffect with fltData[0][1]=${fltData[0][1]}, already created=${jqCreated}`);
      //   else console.log("FltMList useEffect with fltData empty");
    //if (jqCreated) 
    if (fltData.length===0) {
      console.log(`}}} fltData uninitialized`);
      return;
    }
    if (jqCreated[0] && (itemsChanged || dtFilters[fid].size==0)) {
      //remove all items, recreate the list, re-apply selection!
      deselectAll(true);
      clearList(fid, isToggle);
      jqCreated[0]=false;     
      appliedStates[0]=onlyStates[0];
      //TODO: showAppliedSelection(); -- does not really work if the applied items are no longer present!
    }
    if (!jqCreated[0]) {
      //console.log(`FltMList ${fid} creating with filter size: ${dtFilters[fid].size}`);
      let jc=jqRender(fid, fltData, isToggle, isHoriz, noCollapse) //, notifyUpdate);
      jqCreated[0]=true;
      btnApply[0] = jc.find('.lg-apply');
      if (isToggle) {
        //console.log(`FltMList toggle ${fid} creating with counts: ${fltData[1]}`);
        addToggleHandlers(jc); //also adds the Apply button
      } else {
        // ---- regular, non-toggle multi-select list:
        // add scrolling, collapse and apply click handlers
        if (dtFilters[fid].size===0) unCollapse(jc);
        let li=jc.find('.lg-item').last();
        flDt.current.lHeight=Math.floor(li.position().top+li.outerHeight(true));
        //addApplyButton(jc);
        addHandlers(jc, flDt.current.lHeight); 
      }
      if (dtFilters[fid].size) 
        showAppliedFilter();
    }
    /*
    return() => {
      //cleanup -- remove the component
      console.log("Unmounting -- cleaning up !", fid);
      let jc=$(`#${fid}`);
      jc.remove();
    }
    */
  } );

  useEffect( () =>  {
    if (fltData.length===0) return;
    function jqUpdate() { 
      //if (fltData.length===0 || fltData[1].length<=1) return;
      if (isToggle) {
        $('#'+fid+' .lg-toggler').children().each( 
           (i, li) => {
            let el= $(li).find('.lg-count');
            // // el.toggleClass(fltData[1][i+1]===0, 'lg-count-0');
            //el.html(fltData[1][i+1]);
            el.html(fltData[i][1]); //update count badge
         });
        return;
      }
      $(`#${fid} .lg-scroller`).children().each( 
        (i, li) => {
          let el= $(li).find('.lg-count');
          el.html(fltData[i][1]);
          //if (fltData[1][i+1]===0 || fltData[1][i+1]==='0') 
          //   el.addClass('lg-count-0')
          //   else el.removeClass('lg-count-0')
          el.toggleClass('lg-count-0', fltData[i][1]===0);
       });              
       
    }
    //if (isFirstRender) return;
    //-- no need to update if the update was due to self
    //if (fid===fltUpdId) return; //self-inflicted update, don't change the counts?
   
    jqUpdate();  //update counts only  
  }, [fltFlip, fid, fltUpdId, fltData, itemsChanged, isToggle] );
 

  function showAppliedFilter() {
    if (fid==='reg') {
      //special case when not in Brain Matrix but a region filter was set in Brain Matrix
      const selXType=rGlobs.selXType;
      if (dtFilters.brXtX.size && dtFilters.brXtX.values().next().value!==selXType-1)
      return; //do not show the filters set in Brain Matrix for another data type!
    }
    const fltSet=dtFilters[fid];
     if (isToggle) {
        const lgtoggler=$('#'+fid+' .lg-toggler');
        lgtoggler.children().each( 
           (i, t) => {
            const sid=t.id;
            if (sid) { 
              let id=parseInt(sid, 10);
              if (fltSet.has(id)) {
                 onlyData.push(id);
                 onlyStates[0]=strPut(onlyStates[0], id-1 , '1');
                 $(t).addClass('lg-sel');
              }
            }       
       });
      appliedStates[0]=onlyStates[0];
      return;
     }  
    const lgscroller=$(`#${fid} .lg-scroller`);
    lgscroller.children().each( 
        (i, t) => {
       const sid=t.id;
       if (sid) { 
         let id=parseInt(sid, 10);
         if (fltSet.has(id)) {
            onlyData.push(id);
            onlyStates[0]=strPut(onlyStates[0], id-1 , '1');
            $(t).addClass('lg-sel');
         }
       }
     });
     appliedStates[0]=onlyStates[0];
     if (onlyData.length) {
       const p = lgscroller.closest('.lg-panel').find('.lg-only');
       p.show();
       let to=p.append('<span class="lg-only-lb">only</span>');
       to.children().on('click', ()=> {
         //click on the 'only' clears the filter!
          deselectAll();
       } );
       onlyData.forEach( (oid)=> {
        //o is the dtaNames index, we need to display the item having idx o
        p.append('<span class="lg-only-item">'+fltData[idMap[oid]][0]+'</span>') 
      });  
     }
  }

  function clearOnlyStates() {
    onlyStates[0]='';
    for (let i=0;i<idMap.length;i++) { onlyStates[0] += '0' }
    onlyData.length=0;
  }

  function applyFilter() { 
    //onlyCounts string should be applied
    if (onlyData.length===onlyStates[0].length) {
      //all selected means none selected
      deselectAll(true);
    }
    //console.log("applyFilterData for ",fid, "onlyData=", onlyData);
    applyFilterData(fid, onlyData); //this updates counts, etc.
    appliedStates[0]=onlyStates[0];
    notifyUpdate(fid); //broadcast the new counts update to other components
  }
  
  function filterChanged() { //must apply it
      if (appliedStates[0].indexOf("1")<0 && 
          (onlyStates[0].indexOf("0")<0)) {
            //deal with the silly case when all are selected
            //deselectAll(true);
            btnApply[0].hide();
            return;
      }
      if (onlyStates[0]===appliedStates[0]) {
        btnApply[0].hide();
        return;
      }
      btnApply[0].show();
  }

  function deselectAll(noupd) {
    clearOnlyStates();
    $('#'+fid+' .lg-scroller').find('.lg-sel').removeClass('lg-sel');
    //t.parents('.lg-panel').find('.lg-sel').removeClass('lg-sel'); //removeClass('lg-sel');
    let p = $('#'+fid).find('.lg-only');
    p.hide(); p.empty();
    if (noupd) return;
    filterChanged();
  }

 function toggleItem(t, tsel) {
   let i = parseInt(t[0].id); //1-based dtaNames index
   clearOnlyStates();
   if (tsel) {
     onlyData.push(i);
     onlyStates[0]=strPut(onlyStates[0], i-1 , '1');
   }
   filterChanged();
 }

 function addOnlyItem(t) {
    let p = t.closest('.lg-panel').find('.lg-only');
    let id = parseInt(t[0].id); //1-based dtaNames index, not matching list index
    //actual display list index is: t.index()
    onlyData.push(id); 
    p.show();
    if (onlyData.length===1) { //first item added
      let to=p.append('<span class="lg-only-lb">only</span>');
      to.children().on('click', function() {
        //click on the 'only' clears the filter!
         deselectAll();
      } );
    }
    p.children().remove('.lg-only-item'); //remove all
    onlyData.sort((a, b) => a - b);
    onlyData.forEach( function(oid) {
      //o is the dtaNames index, we need to display the item having idx o
      p.append('<span class="lg-only-item">'+fltData[idMap[oid]][0]+'</span>') 
    });
    onlyStates[0]=strPut(onlyStates[0], id-1 , '1');
    //console.log("[addOnlyItem] onlystates:" ,onlyStates[0], "applied:", appliedStates[0]);

    filterChanged();
  }
  
 function removeOnlyItem(t) {
    let p = t.closest('.lg-panel').find('.lg-only');
    let id = parseInt(t[0].id, 10); //1-based index
    //remove item with value i from onlyData
    let ix=onlyData.indexOf(id);
    if (ix>=0) onlyData.splice(ix, 1);
    if (onlyData.length>0) {
      p.children().remove('.lg-only-item'); //remove all items, re-add them
      onlyData.map( o => p.append(`<span class="lg-only-item">${fltData[ idMap[o] ][0]}</span>`) );
    } else { p.hide(); p.empty(); }
    onlyStates[0]=strPut(onlyStates[0], id-1 , '0');
    filterChanged();
 }

function unCollapse(jc) {
  let t=jc.find('.lg-title');
  if (t) {
    jc.find('.lg-lst').collapse('show');
    t.removeClass('lg-collapsed');
    //scrollShader(p, lh);
    t.find('.coll-glyph').html(arrowLeft)
    }
}
 
function onApply(e) {
      //actually apply the changes
      const btn=$(e.target)
      const jc=btn.closest('.lg-panel')
      btn.hide()
      applyFilter() //onlyStates string is applied
      e.stopPropagation()
      if (isToggle) return
      if (onlyData.length>0) {
           //collapse it automatically if there is anything selected!
           let t=jc.find('.lg-title');
           jc.find('.lg-lst').collapse('hide');
           t.addClass('lg-collapsed');
           t.find('.coll-glyph').html(arrowDown);
        } else {
          let t=jc.find('.lg-title');
          jc.find('.lg-lst').collapse('show');
          t.removeClass('lg-collapsed');
          //scrollShader(p, lh);
          t.find('.coll-glyph').html(arrowLeft)
        }
 }
 /*
 function addApplyButton(jc) {
    btnApply[0] = jc.find('.lg-apply');

 }
 */

 function toggleCollapse(e) {
  const t=$(e.target).closest('.lg-title') 
  const p = t.closest('.lg-panel').find('.lg-lst')
  if(!t.hasClass('lg-collapsed')) {
    p.collapse('hide');
    t.addClass('lg-collapsed');
    t.find('.coll-glyph').html(arrowDown);
  } else { //un-collapse
    p.collapse('show');
    t.removeClass('lg-collapsed');
    scrollShader(p, flDt.current.lHeight);
    t.find('.coll-glyph').html(arrowLeft)
  }
 }

 function addHandlers(jc, lh) {
    let jscroller=jc.find(' .lg-scroller');
    scrollShader(jscroller, lh);
    jscroller.on('scroll', (e) => scrollShader($(e.target), lh) );
    if (noCollapse) return;
    
    jc.on('click', '.lg-item', function(e) { 
      let t = $(this);
      if (!t.hasClass('lg-sel')) {
          t.addClass('lg-sel');
          addOnlyItem(t);
      } else {
        t.removeClass('lg-sel');
          removeOnlyItem(t);
      }
  });
 }

 function addToggleHandlers(jc) {
  jc.on('click', '.lg-item', function() {
    let t = $(this);
    if(!t.hasClass('lg-sel')) {
    //var p=$this.parents('.panel').find('.panel-body');
      t.siblings().removeClass('lg-sel');
      t.addClass('lg-sel');
      //$this.find('b').removeClass('bi-chevron-up').addClass('bi-chevron-down');
      toggleItem(t, true);
    } else {
      t.removeClass('lg-sel');
      toggleItem(t, false);
      //$this.find('b').removeClass('bi-chevron-down').addClass('bi-chevron-up');
    }
  });
  /*
  btnApply[0] = jc.find('.lg-apply');
  btnApply[0].on('click', function(e) {
    //actually apply the changes
     $(this).hide();
     applyFilter(); //onlyStates string is applied
     e.stopPropagation();
  });
  btnApply[0].hide();
  */

 }
  // --- render FltMList ---
  let addclass=props.class ? `lg-panel ${props.class}` : "lg-panel";
  return (
       <div className={addclass} id={props.id} style={{ width : (props.width ? props.width : "auto") }}>
        <div className="lg-title"><span onClick={noCollapse ? null : toggleCollapse} class={noCollapse ? "" : "lg-clickable" }>
          {id2name[props.id]}</span>
           <span className="float-right">
             <span className="lg-apply" onClick={onApply}>Apply</span>
             { !noCollapse &&
                 <span className="coll-glyph" onClick={noCollapse ? null : toggleCollapse}> </span>
             }
           </span>
        </div>
          { isToggle ? <ul className="lg-toggler">  </ul> 
          : 
          <ul className="collapse show lg-lst">
           <div className="lg-scroller" style={{ maxHeight : props.height ? props.height  : "8.6rem"}}> </div>
           <div className="lg-topshade"> </div>
           <div className="lg-bottomshade"> </div>
          </ul> }
        {!isToggle && <div className="lg-only"> </div>}
       </div>
     )
}

function clearList(id, isToggle) {  
  let jc=$(`#${id}`);
  if (isToggle) {
      let jl=jc.find('.lg-toggler');
      jc.off('click', '.lg-item');
      jl.empty();
    } else {
    let jl=jc.find('.lg-scroller');
    jl.off();
    jc.off('click', '.lg-item');
    jl.empty();
  }
  let ba=jc.find('.lg-apply');
  ba.off('click');
  ba.hide();
}
  
function ckPubStatus(pd) {
  if (!pd) return '';
  return (pd===1) ? ' lg-item-lock' : ' lg-item-pub';
}

function populateList(id, dta, isToggle, isHoriz) {
  //dta is [fltNames, fltCounts, pubStatus ] ----
  //                       0     1     2      3       4        5
  //dta is a list of  [ label, count, pub, index, oriCounts, fullname ]
  /* <li class="d-flex justify-content-between lg-item">
    First one <span class="badge-primary badge-pill lg-count">24</span>
    </li> */
  if (isToggle) {
    let st='lg-item';
    if (isHoriz) st+=' lg-item-h';
    $('#'+id+' .lg-toggler').append(
      $.map(dta, (d,i) => { 
         return '<li class="d-flex justify-content-between '+st+'" id="'+d[3]+'">'+d[0]+
           ' <span class="badge-primary badge-pill lg-count">'+d[1]+'</span>'+
           "</li>\n";
      }).join(''));
    return
  }
  $('#'+id+' .lg-scroller').append(
    $.map(dta, (d,i) => { 
       return '<li class="d-flex justify-content-between lg-item'+ckPubStatus(d[2])+
       '" id="'+d[3]+'">'+d[0]+
        ' <span class="badge-primary badge-pill lg-count">'+d[1]+'</span>'+
         "</li>\n" ;
    }).join(''));
}

function jqRender(id, dta, isToggle, isHoriz, noCollapse) {
  
  populateList(id, dta, isToggle, isHoriz, noCollapse);
  let jc=$(`#${id}`);
  if (!isToggle) 
    jc.find('.coll-glyph').html(arrowLeft);
  /*  
  if (id==='sex') {
    jc.css("line-height","1rem");
    jc.find('.lg-title').css("line-height","1rem");
    jc.css("font-size","90%");
  }
  */
  if (id==='proto') {
    jc.css("font-size","84%");
    jc.css("line-height","1rem");
    let jt=jc.find('.lg-title');
    jt.css("line-height","1.2rem");
    jt.css("font-size", "110%")
  }
  
  if (id==='dset') {
    jc.find('.lg-title').css("text-align","center");
    jc.find('.lg-title').css("color","#dd1848");
  }
  
  return jc;
}


function scrollShader(t, lh) {
  var y = t.scrollTop();
  //var p = t.parents('.lg-panel').find('.lg-title');
  var l = t.closest('.lg-panel').find('.lg-lst');
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

export default FltMList
