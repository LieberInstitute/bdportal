import { h } from 'preact';
import {useEffect, useState, useReducer} from "preact/hooks";
import { Input } from "reactstrap";
import ReactBootstrapSlider from "react-bootstrap-slider";
import './agerange.css';
import $ from "jquery";

function AgeRangeEntry( { enabled, min, max, vmin, vmax, onChange } ) {
	//min max = absolute range
	//vmin vmax = user set range (value min value max)
	const [state, setState] = useState([enabled, vmin, vmax]);
    //const [, forceUpdate] = useReducer(x => x + 1, 0);
   
	useEffect( () => {
        console.log("useEffect with toggle=",state[0]);
        if (state[0]) { 
            $('#ageSlider .slider-handle').css('background', '#e24');
            $('#ageSlider .slider-selection').css('background','#f68');
            $('#ageMin').prop("disabled",false);
            $('#ageMax').prop("disabled",false);
        } else {
            $('#ageSlider .slider-handle').css('background', '#ddd');
            $('#ageSlider .slider-selection').css('background','#ddd');
            $('#ageMin').prop("disabled",true);
            $('#ageMax').prop("disabled",true);
        }
	});
	
   function toggleEnable(e) {
      let v=e.target.checked;
      console.log("toggle to enabled state:", v)
      updateState([v, state[1], state[2] ]);
      //forceUpdate();
   }

	function updateState(st) {
		if (state[0]!=st[0] || st[1]!=state[1] || st[2]!=state[2]) {
		   if (onChange) onChange(st);
           setState(st);
        }
	}


    function updateRange(r) {
        updateState([state[0], r[0], r[1]])
    }

	function onSlideStop(e)  {
		updateRange(e.target.value);
	}

    function updateVMin(e) {
        let range=[state[1], state[2]];
		let v=e.target.value;
		if (v==='' || v==='-') return;
		if (v && !isNaN(v=parseInt(v, 10))) {
		   //console.log("vmin update: ", v)
		   let ov=v;
		   if (v>max) v=max;
		   if (v>range[1]) v=range[1];
		   if (v<min) v=min;
		   if (v!=range[0]) {
			   updateRange([v, range[1]]);
			   //console.log("range update: ", v, vmax)
		   }
		   if (ov!==v) e.target.value=v;
		} else {e.target.value=range[0]}
	}

    function updateVMax(e) {
		//console.log("vmax update: ", e.target.value)
        let range=[state[1], state[2]];
		let v=e.target.value;
		if (v==='' || v==='-') return;
		if (v && !isNaN(v=parseInt(v, 10))) {
		   //console.log("vmax update: ", v)
		   let ov=v;
		   if (v>max) v=max;
		   if (v<range[0]) v=range[0];
		   if (v<min) v=min;
		   if (v!=range[1]) {
			   updateRange([range[0], v]);
			   //console.log("range update: ", v, vmax)
		   }
		   if (ov!==v) e.target.value=v;
		} else {
			e.target.value=range[0]
		}

	}

    function resetMin(e) {
		let v=e.target.value;
		if (v==='' || v==='-') {
			v=state[1];
			e.target.value=v;
		}
	}

	function resetMax(e) {
		let v=e.target.value;
		if (v==='' || v==='-') {
			v=state[2];
			e.target.value=v;
		}
	}

    if (!min) min=-1;
	if (!max) max=110;
    const disabled=state[0] ? "no" : "disabled";
    const range= state[0] ? [ state[1], state[2] ] : [ min, max ];
	console.log("..rendering with range:", range[0], range[1], " disabled=",disabled);
	return (<div className="age-panel">
		<div className="age-title">Age range
           <label className="custom-control custom-checkbox">
               <Input type="checkBox" className="custom-control-input" onChange={toggleEnable} />
           <span className="custom-control-label"> </span>
           </label>
        </div>
        <div className="age-padder">
		<ReactBootstrapSlider id="ageSlider"
                slideStop={onSlideStop}
				value={range}
                range={true}
				max={max}
				min={min}
				step={1} 
                disabled={disabled}
                />
        </div>
        <div className="age-padder">
			<input id="ageMin" type="number" size="4" pattern="^-?[1-9]\d*$" 
			  onChange={updateVMin} onBlur={resetMin} min={min} max={max} value={range[0]} />
			<span className="age-spacer"> .. </span>
			<input id="ageMax" type="number" size="4" pattern="^-?[1-9]\d*$" 
			  onChange={updateVMax} onBlur={resetMax} min={min} max={max} value={range[1]} />
		</div>		
	</div>)
}

export default AgeRangeEntry