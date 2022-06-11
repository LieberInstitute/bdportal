import $ from 'jquery';
import './ui.css';
import {useEffect, useState, useRef, useReducer} from "preact/hooks";
import {AgeRange, fullAgeRange} from './AgeRange'
import {Row, Col, Button, Label, Input, CustomInput, DropdownMenu, DropdownToggle,
  DropdownItem, UncontrolledDropdown} from 'reactstrap'
import { getFilterAgeRange, switchAgeBinToRange, switchAgeRangeToBin,
  applyFilterSet, getFilterData, getFilterSet, updateCounts} from './RDataCtx'
 import {FltMList} from './FltMList'
 import {ToastBox} from './ToastBox'
// encapsulate dual Age selection panel for reuse
// onAgeSelection(ageType) callback to the parent so it can call notifyUpdate('age') after the counts were updated!
//    (the actual age selection can be found in dtFilters(), already applied!)
//NOTE: this component ALREADY UPDATES the filters (calls applyFilterSet('age') or applyAgeRange(v1, v2) which in turn
//      already call updateCounts() !!!
// however onAgeSelection should still be called in order to notify the app (other components)
// about the update!
//  -- to clear selection (and reset the state of the component, force its recreation by generating a new key)
export default function AgeDualPanel(props) {
  const width=props.width || "15em";

  const dtfAgeBins = getFilterData('age')
  const fltAgeRange = getFilterAgeRange() // this should be direct reference to dtFilters.ageRange
  let initSelType= fltAgeRange.length ? 1 : 0
  /* function getInitialState() {
   console.log(" ~~~~~~~~~~~ AgeDualPanel guess initial ageType state --")
   //dtfAgeBins=getFilterData('age')
   const ar=getFilterAgeRange()
   console.log("             ~~~~~~~ age range:", ar)
   return (ar.length ? 1 : 0)
  }*/

  const onAgeSel=(props.onAgeSelection && typeof props.onAgeSelection == 'function') ? props.onAgeSelection : null

  const [ageType, setAgeType] = useState(initSelType);

  const ageDispTypes=[ "Age bins ", "Age range " ]

  // keep track of object creation, so the right tab is shown from dtFilters as needed
  const refData = useRef({
    created: false
  })

  function disabledClickInfo(fid, cause) {
    //fid must be 'age'
      if (cause=="age-range")
         $(`#tsAgeRange`).toast('show')
  }

   // age selector switching
  function ageTypeClick(sel) {
    if (sel==ageType) return;
 /* TODO: if sel:
     1) - switching from AgeBin to AgeRange
         if more than 1 bin selected, set min-max to min bin start to max bin end
     0) - switching from AgeRange to AgeBin
           auto select bin(s) if they can be matched exactly by AgeRange
           otherwise cancel selection (with a pop-up notice?)
  */
    let noUpdate=true
    noUpdate=sel ? switchAgeBinToRange() : switchAgeRangeToBin()
    if (!noUpdate) {
        noUpdate=true
        console.log("NOTICE::::: Age selection cleared!")
        //manual trigger popover to let the user know? or Alert?
        // or better yet -- Toast(!)
        if (onAgeSel) onAgeSel(ageType) //the caller will find the new age selection in dtFilters.age
    }
     setAgeType(sel)
  }

   function applyAgeBinFilter() {
     applyFilterSet('age') //this simply calls updateCounts() actually
     //dtFilters.age is directly read/updated at each render by the GUI
     if (onAgeSel) onAgeSel(ageType) //the caller will find the new age selection in dtFilters.age
  }

  function applyAgeRange(ageMin, ageMax) {
    //applyFilterAgeRange() //this should simply call updateCounts() actually
    updateCounts()
    if (onAgeSel) onAgeSel(ageType) //the caller will find the age selection in dtFilters.age
  }



  /* let showAgeType=ageType
  if (! m.created) {
   //first render
   // decide which Age selector should be shown
   m.created=true
   if (fltAgeRange.length && showAgeType!=1) {
      console.log("---------------- switching to ageType 1")
      showAgeType=1
      setAgeType(1)
   }
 }
 */

  let age_rmin=fullAgeRange[0], age_rmax=fullAgeRange[1]
  if (fltAgeRange.length==2) {
    age_rmin=fltAgeRange[0]
    age_rmax=fltAgeRange[1]
  }

//console.log(">>>>> --- rendering AgeDual Panel with ageType=", ageType,
//    "  ageRange filter: ", fltAgeRange, "   vmin/vmax: ", age_rmin, age_rmax)


  const ckey=String(Date.now()).substring(4)
  //key={ckey}

  return (
   <Row className="d-flex justify-content-start pt-0 mt-0" style={{position: "relative"}}>
     { ageType ?
         <AgeRange  width={width} title=" " drange={fltAgeRange} onApply={applyAgeRange} notitleclick />
       : <FltMList id="age" title=" " width={width} ageRange={getFilterAgeRange()} data={dtfAgeBins} filter={getFilterSet}
           onApply={applyAgeBinFilter} onNoClickInfo={disabledClickInfo} notitleclick updateFilter />
     }
     <UncontrolledDropdown className="p-0 m-0 age-t-dd">
       <DropdownToggle className="age-t-dtoggle v-100 m-2" nav caret>
         {ageDispTypes[ageType]}
       </DropdownToggle>
       <DropdownMenu className="age-t-ddlst">
         {  ageDispTypes.map((t, i) => (
             <DropdownItem key={i} onClick={ () => ageTypeClick(i)}>{t}</DropdownItem>
           )) }
       </DropdownMenu>
     </UncontrolledDropdown>
     <ToastBox id="tsAgeRange" text="A custom age range was selected. Dismiss it before selecting age bins." />
   </Row>)
  }
