import $ from 'jquery'
import { h } from 'preact'
import {useEffect, useRef} from "preact/hooks"
import { useRData, rGlobs, dtaNames, dtaSelTypes, useFltCtx, useFltCtxUpdate,
  applyFilterData, useFirstRender, dtXCounts, dtFilters} from '../../comp/RDataCtx';
//         applyFilterData, useFirstRender, dtXCounts, dtFilters} from '../../comp/RDataCtx';
import { useMxSelUpdate } from './mxSelCtx';
import './RMatrix.css';
//import * as gu from '../../comp/gutils'
import * as gu from '../../comp/gutils'
import brainImg from '/assets/br_sect_100w.png'

//var globvar=0;
let mxVals=[]; //array with counts (assay_types x regions) - but the first column has the "aggregated" counts which should be skipped
let xData=null; // will be set with dtXs, array of [sid, d, dx, r, s, a, rg, br]
// if any of these changes, we'll rebuild/refill the matrix
// otherwise we should just update the numbers
const mxMaxVal=700;
const dtaXTypes=dtaSelTypes.slice(1,7);
const clShadeHover='#FFF0F0';
const clShadeHoverRGB='rgb(255,240,240)';
//const clHdrSelFg='#A00';
const clHdrSelFg='#ed1848';

let setSelData=null;
let isFirstRender=false;

function getMxVal(r,c) {
  if (r>=mxVals.length-1) return 0;
  return mxVals[r+1][c]; //dtXCounts.reg[0] has no data
}

function strPut(s, i, c) {
  i=parseInt(i,10);
  if (i>s.length-1 || i<0) return s;
  let r=s.substring(0, i).concat(c, s.substring(i+1));
  return r;
}

function RMatrix( props ) {
    //const [selXType, xdata, counts, brcounts] = useRData(); //[rGlobs.selXType, dtXs, dtCounts, dtBrCounts]
    //const [xdata, scounts, counts, data_loaded]=useRData();    //dtXsel, dtCounts, dtBrCounts, rGlobs.dataLoaded
    const [xdata, scounts, bcounts, data_loaded]=useRData();
    //however, for Brain Matrix we really need to be using dtXCounts.reg

    // xdata : array of [br_idx, sample_id, dset_idx, reg_idx, proto]
    const [fltUpdId, fltFlip] = useFltCtx(); //fltUpd is just a [fltId, fltFlip]
    const notifyUpdate = useFltCtxUpdate();
    isFirstRender=useFirstRender(); //only true for the first render!

    const flDt = useRef({ //similar to FltMList
      onlySt:[''], //string of '0'or '1' for each item holding the current visual selection (applied or not)
      appSt:[''], // same with onlySt, but applied
      appSelcol:[0], //applied selection column (can be 0 if there was no selection )
      //idMap:[], //mapping a dtaNames index to its index in the displayed region list ?
      selcol:[0], //selcol[0] has the value of selected column
      selregs:[],
      interSects:[], //array of boolean for the intersect flag by exp. data type index xt
      btnApp: [null]
    })
    const onlyStates=flDt.current.onlySt; //changing/current selected states
    const appliedStates=flDt.current.appSt; // selected set as last applied
    const appliedCol=flDt.current.appSelcol;
    const btnApply=flDt.current.btnApp;
    //const idMap=flDt.current.idMap; //mapping original index to list display index
    const selregs=flDt.current.selregs; //0-filled array, selected set to 1
    const selcol=flDt.current.selcol;

    //console.log(`RMatrix rendering requested: fltUpdId=<${fltUpdId}> flip=${fltFlip}, data len=${xdata.length}`);
    setSelData = useMxSelUpdate(); //updates context on every selection click (applied or not)

    xData = xdata; //set the global var here
    let numRegs=0;
    if (bcounts.reg.length>0) numRegs=bcounts.reg[0].length;

    // below we have copies of FltMList functions.. should be shared
    //return a string obtained by changing character at position i in s with c

    useEffect( () =>  {
        if (isFirstRender && dtXCounts.reg.length>0) {
              //reset/reinit
              //resetting matrix
              selcol[0]=0;
              selregs.length=0;
              const regcounts=dtXCounts.reg;
              //console.log(`...   Rebuilding RMatrix....`);
              for (let i=1;i<dtaNames.reg.length;i++) {
                 selregs.push(0);
              }
              clearOnlyStates();
              appliedStates[0]=onlyStates[0]; //states as last applied
              const jc=jqRender(dtaXTypes, regcounts);
              addHandlers(jc)  // hover and click handlers
              addApplyButton(jc)
              if (dtFilters.reg.size && dtFilters.brXtX.size)
                      showRegFilter();
            }
        } );

        useEffect( () =>  {
          function jqUpdate() { //update values from mxVals
            //let rix=0, cix=0;
            if (isFirstRender || mxVals.length===0) return;
            //console.log('... RMatrix update ..>>')
            if (dtFilters.reg.size==0) {
                deselectAll(true);
                appliedStates[0]=onlyStates[0];
                appliedCol[0]=0;
            }
            $('#rxMatrix > tbody > tr').each( (rix, tr ) => {
              $(tr).find('td').each( (cix, td) => {
                let v=getMxVal(cix, rix+1);//mxVals[rix][cix];
                //console.log(`rix=${rix}, cix=${cix}`)
                //let v=rix.toString()+'.'+cix.toString();
                let t=$(td);
                t.html((v===0)?'':v);
                shadeCell(t,v);
                if (cix+1===selcol[0] && selregs[rix])
                       selectCell(t, rix, cix, 1);
              });
            });
            filterChanged();
            updateMxSel(); //? needed
          }
           //if (isFirstRender) return;
           jqUpdate(); //restore selection!

        }, [fltFlip] );


        function showRegFilter() {
            //when the matrix is rebuild, previous region filters are re-applied
            //console.log(" ....  showRegFilter() on matrix!\n", );
            const col=dtFilters.brXtX.values().next().value; // 0-based !
            dtFilters.reg.forEach( (it) => {
              //console.log(" .. reg filter item:", it)
              selregs[it-1]=1;
              selectCell(null, it-1, col+1, 1); //this also sets onlyStates and selcol
              //console.log(` selcol[0]=${selcol[0]}`)
           });
           appliedStates[0]=onlyStates[0];
           appliedCol[0]=selcol[0];

           updateMxSel()
        }

        function clearOnlyStates() {
          selcol[0]=0
          for (let i=0;i<selregs.length;i++) selregs[i]=0;
          onlyStates[0]='';
          for (let i=0;i<numRegs;i++) { onlyStates[0] += '0' }
        }

        function filterChanged() { //must apply it
          /*if (appliedStates[0].indexOf("1")<0 &&
              (onlyStates[0].indexOf("0")<0)) {
                //deal with the silly case when all are selected
                //deselectAll(true);
                btnApply[0].hide();
                return;
          } */
          if (onlyStates[0]===appliedStates[0] && appliedCol[0]===selcol[0]) {
            btnApply[0].hide();
            return;
          }
          btnApply[0].show();

      }

      function applyFilter() {
          //prepare onlyData array, which is an array of 1-based indexes of selected regions
          const onlyData=[];
          for (let i=0;i<selregs.length;i++)
             if (selregs[i]>0) onlyData.push(i+1);
          applyFilterData('reg', onlyData, selcol[0]); //this updates counts etc.
          appliedStates[0]=onlyStates[0];
          appliedCol[0]=selcol[0];
          notifyUpdate('reg'); //broadcast the new counts update to other components
        }

        function addApplyButton(jc) {
          btnApply[0] = jc.find('.lg-apply');
          btnApply[0].off('click')
          btnApply[0].on('click', function() {
            //actually apply the changes
            $(this).hide();
            applyFilter(); //onlyStates string is applied
          });
          btnApply[0].hide(); //hide after adding it
       }


     //if (cxdata.length===0) return (<div>. . . L O A D I N G . . . </div>);
    function deselectAll(noupd) {
      if (selcol[0]>0) {
        for (let r=0;r<selregs.length;r++) {
                if (selregs[r]>0) {
                    deselectCell(null, r, selcol[0], 1);
                }
        }
        clearOnlyStates();
      }
      if (noupd) return;
      updateMxSel();
      filterChanged();
    }

    function updateMxSel() {
      setSelData([selcol[0], selregs, mxVals, xData]);
    }

    function hoverCell(t, r, c, out) {
      if (selregs[r] && selcol[0]===c && t.html().trim().length!==0) return;
      const obg=t.prop('obg');
        if (out) {
           if (obg) {
              t.css('background-color', obg);
           }
           else t.css('background-color', '');
        } else if (obg) {
              const nc=gu.blendRGBColors(obg, clShadeHoverRGB, 0.1);
               t.css('background-color', nc );
              } else t.css('background-color', clShadeHover);
    }

    function handleHover(t, out) {
      const cix = t.index(); //column index
      const rix = t.parent().index(); //row index
      //highlight row

      t.siblings('td').each(function() {
          const td=$(this);
          const c=td.index();
          //if (c!==selcol) // || !selregs[rix])
          hoverCell(td, rix, c, out);
      });
      if (selregs[rix]) selectTH(t.siblings('th'))
      else hoverTH(t.siblings('th'), out) //regular, not selected region

      // highlight column, unless locked on one
      if (selcol[0]===0 || selcol[0]===cix) {
        $('#rxMatrix td:nth-child(' + (cix+1) + ')').each( function() {
            const td=$(this);
            const r=td.parent().index();
            //if (cix!==selcol) //|| !selregs[r])
            hoverCell(td, r, cix, out);
        });
        //if (cix!==selcol) //|| !selregs[rix])
        hoverCell(t, rix, cix, out);
        //highlight column
        var ch=$('#rxMatrix th:nth-child(' + (cix+1) + ') > div > span');
        if (cix===selcol[0]) {
            selectTH(ch);
        } else {
            hoverTH(ch, out);
        }
      }
    }

    function selectCell(t, ridx, cix, noupd) {
      if (t==null) {
        t=$('table#rxMatrix tr').eq(ridx+1).find('td').eq(cix-1);
      }
      if (t==null) return;
      if (t.html().trim().length!==0) {
        t.css('font-weight','bold');
        t.css('color', '#fff');
        t.css('background-color', clHdrSelFg);
      } else return; //cannot select empty cell!

      var th=t.siblings('th')
      selectTH(th);
      //th.css('font-weight', 'bold');
      selregs[ridx]=1;
      if (selcol[0]===0) {
          selectTH($('#rxMatrix th:nth-child(' + (cix+1) + ') > div > span'))
          selcol[0]=cix;
      }
      onlyStates[0]=strPut(onlyStates[0], ridx , '1');
      if (!noupd) {
        filterChanged();
        updateMxSel();
      }
    }

    function deselectCell(t, ridx, cix, noupd) {
      if (t==null) {
         t=$('table#rxMatrix tr').eq(ridx+1).find('td').eq(cix-1);
      }
      if (t == null) return;
      t.css('font-weight','normal');
      const obg=t.prop('obg');
      const ofg=t.prop('ofg');
      if (ofg) t.css('color', ofg); else t.css('color', '');
      if (obg) t.css('background-color', obg);
             else t.css('background-color', '');

      selregs[ridx]=0;
      //if (noupd) hoverTH(t.siblings('th'), 1);
           // else
      deselectTH(t.siblings('th'));
      let sel=0;
      for (let i=0;i<selregs.length;i++) {
        if (selregs[i]) { sel=1; break; }
      }
      if (sel===0) { //deselect whole column
        if (selcol[0])
          deselectTH($('#rxMatrix th:nth-child(' + (selcol[0]+1) + ') > div > span'));
        selcol[0]=0;
      }
      onlyStates[0]=strPut(onlyStates[0], ridx , '0');
      if (!noupd) {
        filterChanged();
        updateMxSel();
      }
    }


   function addHandlers() { //upon creation/reset
    //matrix hover behavior
    $("#rxMatrix td").on('mouseenter', function() {
      handleHover($(this), 0, selcol[0], selregs);
    }).on('mouseleave', function() {
      handleHover($(this), 1, selcol[0], selregs);
    });

    $("#rxMatrix td").on('click', function() {
      const t=$(this);
      const coln = t.index(); // 1-based !
      const rowidx =  t.parent().index();
      if (selcol[0]>0 && selcol[0]!==coln) return; //ignore click outside the allowed column
      if (selregs[rowidx]) deselectCell(t, rowidx, coln);
                  else if (t.html()>0) selectCell(t, rowidx, coln);

    });

    $("#rxMatrix th").on('mouseenter', function()  {
      handleTHover($(this), 0, selcol[0], selregs);
    }).on('mouseleave', function() {
      handleTHover($(this), 1, selcol[0], selregs);
    });/*.on('mousemove',function(e) {
      if (!$(this).hasClass("rt")) {
        const mousex = e.pageX - 40; //Get X coordinates
        const mousey = e.pageY - 20; //Get Y coordinates
        $('.rg-tooltip')
          .css({ top: mousey, left: mousex })
      }
    }); */

    //top header click behavior: toggle select/deselect all
    $("#rxMatrix th").on('click', function() {
      let t=$(this);
      let cix=t.index();
      if (t.hasClass("rt")) { // exp type header click
        if (selcol[0]>0 && selcol[0]!==cix) return; //clicking the wrong column
        if (selcol[0]>0) deselectAll(true);
        else { //select all ?
          for (let r=0;r<selregs.length;r++) {
                selectCell(null, r, cix, 1);
          }
        }
      } else { // region header
        let rix=t.parent().index();
        //console.log(`clicked region header rix ${rix}, selcol=${selcol}`);
        if (selcol[0]>0) {
          if (selregs[rix])  deselectCell(null, rix, selcol[0], 1);
                       else  selectCell(null, rix, selcol[0], 1);
        }
      }
      filterChanged();
      updateMxSel();
    });
  }

  return ( <div className="col mx-auto">
          <div className="mxImgBox">
            <img alt="Regions" src={brainImg} />
              {/* <h5>Brain regions</h5> */}
          </div>
          <div className="mxApply"><span className="lg-apply">Apply</span> </div>

          <table id="rxMatrix">
            <thead>
            </thead>
            <tbody>
            </tbody>
          </table>
        </div> )
}

function jqFillMatrix(xt, rn, rtooltips) { //takes values from mxVals!
  //populate top header
  let th=$('#rxMatrix > thead');
  let jc=th.parents('.matrixWrap');

  $("#rxMatrix td").off();
  th.empty();
// -- worked ok:
//  return '<th class="rt"><span class="xSym"><div class="xBtn">&#8898;</div></span><div class="txRotate"><span>'+xt+'</span></div></th>';
  th.append('<tr><th class="cr" style="width:8rem;"></th>'+
     $.map(xt, (xt) => {
        return '<th class="rt"><div class="txRotate"><span>'+xt+'</span></div></th>';
     }).join()+'</tr>');
     //populate rows:
 let tb= $('#rxMatrix > tbody');
 tb.empty();
 tb.append(
       $.map(rn, (r, i) => {
         return '<tr><th><span data-toggle="tooltip" data-placement="left" title="'+ rtooltips[i] +'">'+
            r+'</span></th>'+
            $.map(xt, (x,j) => {
              let v=getMxVal(j,i+1);//mxVals[j][i+1];
              if (v===0) v='';
              return '<td>'+v+'</td>';
            }).join() + "</tr>\n";
      }).join());
      // now iterate through all cells to record their original color values
 $('#rxMatrix td').each(function() {
          let t=$(this);
          let v=t.html();
          shadeCell(t,v)
   });
   return(jc)
 }

 function shadeCell(t, v) {
  if (v>0) {
    let psh=v/(mxMaxVal*4.1);
    let bc=gu.shadeRGBColor('rgb(240,240,240)', -psh);
    let fg=(gu.getRGBLuminance(bc)<120)? '#fff':'#000';
    t.prop('obg', bc);
    t.css('background-color', bc);
    t.prop('ofg',fg);
    t.css('color', fg);
    t.css('cursor', 'pointer');
  } else {
    t.removeProp('obg');
    t.removeProp('ofg');
    t.css('cursor', 'default');
    t.css('background-color', '');
    t.css('color', '');
  }

 }

function jqRender(xtypes, rdata) {
  //this should only be called when matrix data is refereshed (xtypes or rdata change)
  //should have a better check for data refresh (e.g. resetting mxVals.length after a refresh should do it)
  //if (mxVals===rdata && numRegs===rdata.length && numXTypes===dtaXTypes.length) return;
  if (rdata.length===0) {
    console.log("RMatrix --- zero data length!" )
    return;
  }

  rGlobs.rebuildRMatrix=false;

  mxVals=rdata; //mxVals is dtXCounts.reg
  //get data and fill matrix
  return(jqFillMatrix(xtypes, dtaNames.reg.slice(1), dtaNames.regFull.slice(1)))
}

  //--- jquery utility functions
  function handleTHover(t, out, selcol, selregs) {
    if (t.hasClass("rt")) {
      if (selcol>0) return;
    } else {
      //region name hover -- tooltip handling
      /* if (out) {
        // Hover out code
        $(this).attr('title', $(this).data('tipText'));
        $('.rg-tooltip').remove();
      } else {
        // Hover over code
       const title = $(this).attr('title');
       $(this).data('tipText', title).removeAttr('title');
       $('<p class="rg-tooltip"></p>')
        .text(title)
         .appendTo('body')
         .fadeIn('slow');
      } */
      let rix=t.parent().index();
      if (selcol>0 && selregs[rix]) return;
    }
    hoverTH(t, out);
  }

  function selectTH(th) {
    if (th.hasClass("rt")) {
       th.css('color', clHdrSelFg);
    }  else {
      th.css('color', '#fff');
      th.css('background-color', clHdrSelFg);
    }
  }

  function deselectTH(th) {
      th.css('color', '');
      th.css('background-color', '');
  }

  function hoverTH(th, out) {
    if (out) {
      th.css('color', '');
      th.css('background-color', '');
    } else {
      th.css('color', '#622');
    }
  }


export default RMatrix;