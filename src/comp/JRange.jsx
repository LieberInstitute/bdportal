/* eslint-disable react/self-closing-comp */
import $ from 'jquery';
import {useRef, useEffect, useState} from "preact/hooks"
import './JRange.css';

export function JRange( p ) {
  /* { id, type, disabled, min, max, value, from, to, step, scale, width,
    scaleClickable, snap, theme, showLabels, format, showScale,
    value,  decimals, onChange, onDragEnd, onBarClick } */
  //from to = absolute range
  //props.type should be set to 'single' to get a single knob slider
  // or a scalar props.value can be passed
  // if props.value is defined and an array, isRange is set to true
    //value : should be set as a scalar for single slider, array for range slider

  let prop_val;
  if (typeof p.value === 'undefined')
        prop_val = p.type==='single' ? 1 : [ ];
   else prop_val =  Array.isArray(p.value) ? [p.value[0], p.value[1]] : [ p.value ]

	//const [state, setState] = useState([p.disabled, prop_val[0], prop_val[1]])

  if (typeof p.type === 'undefined' && !Array.isArray(p.value))
      p.type='single'
  //persistent variables across renders

  const domRef=useRef(null) //holding ref to slider-container
  function pdef(v, def) { return (typeof v === 'undefined' ? def : v)}
  function pdefbool(v, def) {
     if (typeof v === 'undefined') return def
     return (v=="yes" || v==1)
  }

  function defined(v)  { return (typeof v !== 'undefined') }
  function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null || a.length !== b.length) return false;
    // if you don't care about the order of the elements, sort both arrays first
    for (let i = 0; i < a.length; ++i)
      if (a[i] !== b[i]) return false;
    return true;
  }

  const refData = useRef({ //keep track of previous states and flags
    isRange: (p.type!=='single'),
    from: parseFloat(pdef(p.from,0)),
    to: parseFloat(pdef(p.to,10)),
    step: pdef(p.step, 1),
    scale_prop: p.scale, //prop, not DOM scale element
    width:parseInt(pdef(p.width, 300),10),
    showLabels:pdefbool(p.showLabels, true),
    scaleClickable:pdefbool(p.scaleClickable, false),
    snap:pdefbool(p.snap,true),
    format:pdef(p.format, '%s'),
    theme:pdef(p.theme, ''),
    disabled:pdefbool(p.disabled, false),
    decimals: pdef(p.decimals, 0),
    animate: pdefbool(p.animate, false),
    value: [prop_val[0], prop_val[1]],
    mapValue: p.mapValue,
    mapScale: p.mapScale,
    // - to be updated from DOM:
    lastPos:[],
    rebuild:true, //initial value
    pointers:null,
    loPtr:null,
    hiPtr:null,
    psize:0, //pointer outerWidth
    //pxmul:0, // multiplier for pixel position: pxmul*(value-m.from) to get pixel position
    vstep:0, //value increment, 1/(10^decimals)
    labels:null,
    lowLabel:null,
    highLabel:null,
    scale:null,
    bar:null,
    clickableBar:null,
    interval: 0
  })

  const m=refData.current;

  //check props -- given ref.current and props, re-initializes ref.current
    const isRange=(p.type!=='single')
    if (m.isRange!==isRange) { m.isRange=isRange; m.rebuild=true }
    const from =parseFloat(pdef(p.from,0))
    if (m.from!==from) { m.from=from; m.rebuild=true }
    const to =parseFloat(pdef(p.to,10))
    if (m.to!==to) { m.to=to; m.rebuild=true }
    const step=pdef(p.step, 1)
    if (m.step!==step) { m.step=step; m.rebuild=true }
    const scale_prop=p.scale //prop.scale array, not DOM scale element
    if (!arraysEqual(m.scale_prop, scale_prop)) { m.scale_prop=scale_prop; m.rebuild=true }
    const width=parseInt(pdef(p.width, 300),10)
    if (m.width!==width) { m.width=width; m.rebuild=true }
    const showLabels=pdefbool(p.showLabels, true)
    if (showLabels!==m.showLabels) { m.showLabels=showLabels; m.rebuild=true}
    const scaleClickable=pdefbool(p.scaleClickable, false)
    if (scaleClickable!==m.scaleClickable) { m.scaleClickable=scaleClickable; m.rebuild=true}
    const format=pdef(p.format, '%s')
    if (format!==m.format) { m.format=format; m.rebuild=true}
    const snap=pdefbool(p.snap,true)
    if (snap!==m.snap) { m.snap=snap; m.rebuild=true }
    const theme=pdef(p.theme, '')
    if (theme!==m.theme) { m.theme=theme; m.rebuild=true }
    const disabled=pdefbool(p.disabled, false)
    if (disabled!==m.disabled) { m.disabled=disabled; m.rebuild=true }
    const decimals = pdef(p.decimals, 0)
    if (decimals!==m.decimals) { m.decimals=decimals; m.rebuild=true }

    if (p.mapValue!==m.mapValue) {
         m.mapValue=p.mapValue; //m.rebuild=true
        }
    //if (p.mapScale!=m.mapScale) { m.mapScale=p.mapScale; m.rebuild=true }

    m.animate=pdefbool(p.animate,true)

  function detachEvents() {
    const mm=refData.current
    mm.clickableBar.off('click')
    mm.pointers.off('mousedown touchstart dragstart')
  }

  useEffect(() => {
    const el = $(domRef.current) //points to slider-container
    let v_step=m.vstep
    let v_from=m.from
    let v_interval=m.to - v_from  // + v_step
    let px_width=m.width

    function isDecimal() { return (m.decimals>0)	}

    function decimalFormat(v) { // returns string conversion of a number as requested by props.decimals
      let final = String(Math.round(Math.round(v / m.step) * m.step * Math.pow(10, m.decimals)/Math.pow(10,m.decimals)))
      if (final.indexOf(".")===-1) final += "."
      while (final.length - final.indexOf('.') <= m.decimals)
          final += "0";
      return final;
    }

    function positionToValue(pos) { //returns string conversion as requested by props.decimals
			let val = px2val(pos);
			if (isDecimal()) {
        const dv=parseFloat(val).toFixed(m.decimals)
        val=parseFloat(dv)
				return [dv, val];
      }
      val = Math.round(val / m.step) * m.step
			return [String(val), val];
		}

    function formatValue(ix) {
      let val=m.value[ix]
			if (isDecimal())
				return [parseFloat(val).toFixed(m.decimals), val];
      val = Math.round(val / m.step) * m.step
			return [String(val), val];
    }

    function getDecimalPrecision(num) {
      // This handles the case when num is very small (0.00000001), js will turn this into 1e-8.
      // When num is bigger than 1 or less than -1 it won't get converted to this notation so it's fine.
      if (Math.abs(num) < 1) {
        const parts = num.toExponential().split('e-');
        const matissaDecimalPart = parts[0].split('.')[1];
        return (matissaDecimalPart ? matissaDecimalPart.length : 0) + parseInt(parts[1], 10);
      }
      const decimalPart = num.toString().split('.')[1];
      return decimalPart ? decimalPart.length : 0;
    }

    function roundValueToStep(value, step, min) {
      const nearest = Math.round((value - min) / step) * step + min;
      return nearest.toFixed(getDecimalPrecision(step));
    }

		 function correctPositionForSnap(pos) {
      let val = px2val(pos)
      val = Math.round(val / m.step) * m.step
      val -=  m.from; //value offset
			const diff = px_width / (m.interval / m.step),
			expectedPosition = (val / m.step) * diff;
			if (pos <= expectedPosition + diff/2 && pos >= expectedPosition - diff/2)
				return Math.round(expectedPosition)
			return -1; //error!
		}
    /*
    function correctPositionForSnap(position) {
			let [strVal, currentValue] = positionToValue(position);
      currentValue -=  m.from;
			const diff = m.width / (m.interval / m.step),
				expectedPosition = (currentValue / m.step) * diff;
			if (position <= expectedPosition + diff/2 && position >= expectedPosition - diff/2)
				return expectedPosition;
			return -1; //error!
		}*/

    function isReadonly() {  el.toggleClass('slider-readonly', m.disabled) }

    function updateValue(ix, position, allow_anim, fromValue) {
      //when called with fromValue, only updates labels from existing value
      // otherwise calculate value based on position and update m.value[ix] and labels
      const calcValue=(typeof fromValue === 'undefined')
      if (!calcValue && !m.showLabels) return false //nothing to do
			const label = ix? m.highLabel : m.lowLabel
			let text;
			const [valstr, val]= calcValue ? positionToValue(position) : formatValue(ix)
			// Is it higer or lower than it should be?
			if (typeof m.format === 'function') {
				const type = m.isRange ? (ix ? 'high' : 'low') : undefined ;
				text = m.format(valstr, type);
			} else text = m.format.replace('%s', valstr);
			const lw = label.html(text).width();
      let pleft=Math.min(Math.max(position, 0), px_width);
			pleft-= lw/2;
      if (m.showLabels)
          jqMove(label, { left : pleft }, (allow_anim && m.animate))
			  //label[(allow_anim && m.animate) ? 'animate' : 'css']({ left: pleft	});
      if (calcValue) { //m.value[ix] should be updated
        if (m.value[ix]!==val) {
          m.value[ix] = val
          //updateRangeState()
          return true;
        }
      }
      return false;
		}

     // e.g. jqMove(pointer, { left: newXpos}, true)
     function jqMove(t, mvTo, anim) {
      if (anim) {
        t.stop(true) //prevent animation queue build-up
        t.animate(mvTo)
      } else {// jump
        t.css(mvTo)
      }
     }

    function setPosition(ix, position, allow_anim, fromValue) {
      let leftPos,
         lowPos = parseFloat(m.loPtr.css("left")),
         highPos = parseFloat(m.hiPtr.css("left")) || 0,
         pointer = ix ? m.hiPtr:m.loPtr,
         whalf = m.psize / 2;
      if (m.snap)
        position = correctPositionForSnap(position);
        //if(expPos === -1)  return; //ERROR !
      if (position===m.lastPos[ix]) {
         return false
      }
      m.lastPos[ix]=position
      if (ix) //hiPtr
           highPos = Math.round(position - whalf)
      else lowPos  = Math.round(position - whalf)
      const mvleft=Math.round(position - whalf)
      // update pointer location
      jqMove(pointer, {left: mvleft}, (allow_anim && m.animate) )
      if (m.isRange) {
        leftPos= (m.isRange) ? lowPos + whalf : 0
        const w = Math.round(highPos + whalf - leftPos);
        jqMove(m.bar, { width: Math.abs(w), left: (w>0) ? leftPos : leftPos + w}, (allow_anim && m.animate))
      }
      return(updateValue(ix, position, allow_anim, fromValue))
		}

    function barClicked(ev) {
      if (m.disabled) return;
      let vchanged=false
      const x = Math.round(ev.pageX - m.clickableBar.offset().left);
			if (!m.isRange) {
				vchanged=setPosition(0, x, true);
      } else {
        const firstLeft 	= Math.abs(parseFloat(m.loPtr.css('left'), 10)),
            firstHalfWidth 	= m.loPtr.width() / 2,
            lastLeft 			 	= Math.abs(parseFloat(m.hiPtr.css('left'), 10)),
            lastHalfWidth  	= m.loPtr.width() / 2,
            leftSide        = Math.abs(firstLeft - x + firstHalfWidth),
            rightSide       = Math.abs(lastLeft - x + lastHalfWidth)
        let ix;
        if(leftSide == rightSide)
              ix = x < firstLeft ? 0 : 1;
        else  ix = leftSide < rightSide ? 0 : 1;
        vchanged=setPosition(ix, x, true);
      }
      if (p.onBarClick &&  typeof p.onBarClick == 'function') p.onBarClick(m.value[0], m.value[1])
      if (vchanged) onValueChanged()

    }


   function colorRange() {
     if (!m.isRange) return
     // -- disable/enable range display when full/sel range
     const fullrange=(m.value[0]==m.from && m.value[1]==m.to)
     const rangeShown=!(m.bar.hasClass('full-range'))
     if (fullrange && rangeShown) m.bar.addClass('full-range')
     else if (!fullrange && !rangeShown) m.bar.removeClass('full-range')
   }

   function onValueChanged() { // only call if a vmin or vmax changed!
    colorRange()
    if (p.onChange && typeof p.onChange== 'function') {
      if (m.isRange) {
        let v0=m.value[0], v1=m.value[1]
        if (m.mapValue) {
          v0=m.mapValue(v0)
          v1=m.mapValue(v1)
        }
        p.onChange(v0, v1)
      }
      else {
        let v=m.value[0]
        if (m.mapValue) v=m.mapValue(v)
        p.onChange(v)
      }
    }

   }
   function cbChange(e, ix, position) {
     let min=0, max=px_width;
     // dbg1(`ptr[${ix}] cbChange mouse pos: ${position}`)
     if (m.isRange) {
      min = ix ? parseFloat(m.loPtr.css("left")) + (m.loPtr.width() / 2) : 0;
      max = ix===0 ? parseFloat(m.hiPtr.css("left")) + (m.hiPtr.width() / 2) : px_width;
     }

     const pxpos = Math.min(Math.max(position, min), max);

     const changed=setPosition(ix, pxpos); //this shall update m.value
     if (changed) onValueChanged()

   }

    function cbDragStart(e) {
      if ( m.disabled || (e.type === 'mousedown' && e.which !== 1))
				return;
			e.stopPropagation();
			e.preventDefault();
			const pointer = $(e.target);
			m.pointers.removeClass('last-active');
			pointer.addClass('focused last-active');
      const ix= (pointer.hasClass('low') ? 0 : 1)
			el.find( ix ?  'highLabel' : 'lowLabel' ).addClass('focused');
			$(document).on('mousemove.rslider touchmove.rslider', { pidx: ix }, cbDrag);
			$(document).on('mouseup.rslider touchend.rslider touchcancel.rslider',
                                                  { pidx: ix }, cbDragEnd);
    }

    function cbDrag(e) {
      e.stopPropagation();
			e.preventDefault();
			if (e.originalEvent.touches && e.originalEvent.touches.length) {
				e = e.originalEvent.touches[0];
			} else if (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
				e = e.originalEvent.changedTouches[0];
			}
      const poffset=Math.round(el.offset().left * 100)/100
			const position = Math.round(e.clientX - poffset);
      //dbg1(`ptr[${e.data.pidx}] cbDrag mouseX= ${e.clientX}, ptr.offs.left=${poffset} (pos=${position})`)
			el.trigger('change', [e.data.pidx, position]); //this shall update m.value!
    }

    function cbDragEnd(e) {
      //the onChange event should've updated m.value already!
      m.pointers.removeClass('focused')
        .trigger('rangeslideend');
      m.labels.removeClass('focused');
      $(document).off('.rslider');
      if (p.onDragEnd && typeof p.onDragEnd== 'function') {
        if (m.isRange) p.onDragEnd(m.value[0], m.value[1])
                  else p.onDragEnd(m.value[0])
      }
    }

    function attachEvents() {
      m.clickableBar.on('click', barClicked);
			m.pointers.on('mousedown touchstart', cbDragStart);
			m.pointers.on('dragstart', (event) => event.preventDefault() );
    }

    function setClosestPtr(dv) {
      let vchanged=false;
      if (!m.isRange) {
        vchanged=(dv!==m.value[0])
        showValue([dv,])
        if (vchanged) onValueChanged()
        return
      }
      const d1=Math.abs(m.value[0]-dv)
      const d2=Math.abs(m.value[1]-dv)

      if (d2>d1) { //set value[0]
        vchanged=(dv!==m.value[0])
        showValue([dv, m.value[1]])
        if (vchanged) onValueChanged()
        return
      }
      vchanged=(dv!==m.value[1])
      showValue([m.value[0], dv])
      if (vchanged) onValueChanged()
    }

    function renderScale() {
      let sc = m.scale_prop || [m.from, m.to];
      //console.log('-.-.-.-.- renderScale len', sc.length)
      //calculate pixel multiplier per value unit
      //const pxmul=m.width/(m.to-m.from)
			//let prc = Math.round((100 / (s.length - 1)) * 10) / 10;
			let str = '';
			for (let i = 0; i < sc.length; i++) {
        if (sc[i]<m.from || sc[i]>m.to) continue
        const tickpx=Math.round(val2px(sc[i]))
        let sv=sc[i]
        if (m.mapScale) sv=m.mapScale(sv)
          else if (m.mapValue) sv=m.mapValue(sv)

        //console.log(`   ]]]  tick ${sc[i]} left =`, tickpx)
				//str += '<span style="left: ' + i * prc + '%">' + (s[i] != '|' ? '<ins data-pos="' + i + '">' + s[i] + '</ins>' : '') + '</span>';
        str += `<span style="left: ${tickpx}px"><ins data-pos="${sc[i]}">${sv}</ins></span>`;
			}
      const prevsc=m.scale.html()
      if (prevsc.length>5 && m.scaleClickable) //clean up previous click handlers
          $('ins', m.scale).each( (i, sp) => sp.off("click") )
      //update scale
			m.scale.html(str);
			$('ins', m.scale).each( (i, sp) => {
        const jq=$(sp)
				if (m.scaleClickable) {
					jq.on("click", () => setClosestPtr(String(jq.data('pos'))) )
					jq.css({ marginLeft: -jq.outerWidth()/2,
	                 cursor: 'pointer'	})
				}
        else jq.css({ marginLeft: -jq.outerWidth()/2	});
			});
    }

    //function val2prc(v) { return ((v - v_from)*100 / v_interval)  }
    function val2px(v) { return ((px_width*(v - v_from)) / v_interval)  }
    function px2val(px) { return (((px * v_interval) / px_width)  + v_from) }

    function showValue(av) { //MUST be an array!
      if (!defined(av))
        av=[m.value[0], m.value[1]]
      av[0]= Math.min(Math.max(av[0], m.from), m.to);
			if (m.isRange && defined(av[1])) {
				av[1] = Math.min(Math.max(av[1], m.from), m.to);
        if (av[0]>av[1]) {m.value[0]=av[1] ; m.value[1]=av[0] }
                   else { m.value[0]=av[0] ; m.value[1]=av[1] }
      } else { m.value[0]=av[0] }
      //console.log(">>>>>>>> showValue:",m.value, " pos1: ", Math.round(val2px(m.value[0])))
      setPosition(0, Math.round(val2px(m.value[0])), false, m.value[0]);
      if (m.isRange && defined(av[1]))
				setPosition(1, Math.round(val2px(m.value[1])), false, m.value[1]);
    }
    // --------- post-render code here
    let theme=m.theme;
    if (theme.length>0 && theme!='default') {
        theme=`theme-${theme}`;
       if (!el.hasClass(theme)) el.addClass(theme)
    }
    //console.log(`   +---   JRange useEffect() activation (rebuild = ${m.rebuild})`)

    if (m.rebuild) {
      el.off('change')
      m.interval = m.to - m.from
      m.lastPos=[]
      if (m.isRange) {
        if (!defined(m.value[0])) m.value[0]=m.from+(m.to-m.from)/4;
        if (!defined(m.value[1])) m.value[1]=m.value[0]+(m.to-m.from)/4;
      } else
          if (!defined(m.value[0]))
             m.value[0]= defined(p.value) ? p.value : m.value[0]=m.from+(m.to-m.from)/2;

      el.on('change', cbChange)

      m.pointers = $('.pointer', el)
      m.loPtr    = m.pointers.first()
      m.hiPtr   = m.pointers.last() //is the same with loPtr for single
      m.labels    = $('.pointer-label', el)
      m.lowLabel      = m.labels.first()
      m.highLabel     = m.labels.last()
      m.scale         = $('.scale', el)
      m.bar           = $('.selected-bar', el)
      m.clickableBar  = el.find('.clickable-bar')

      px_width=m.width
      el.width(px_width+1)
      // added extra pixel to the right just for last tick alignment
      if (m.isRange) {
        m.hiPtr.show()
        m.highLabel.show()
        m.bar.show()
      } else {
        m.hiPtr.hide()
        m.highLabel.hide()
        m.bar.hide()
      }
      m.psize=m.loPtr.outerWidth()
      v_step=1/Math.pow(10, decimals)
      m.vstep=v_step
      v_from=m.from
      //vpxmul = m.width/(m.to-v_from+v_step)
      v_interval=m.to-v_from //+v_step
      //update pxmul
      //m.pxmul=vpxmul
      if (m.showLabels) m.labels.show()
                   else m.labels.hide()
      detachEvents()
      attachEvents()
      if (p.scale) renderScale()
      m.rebuild=false;
      if (defined(p.value)) {
        m.value[0]=prop_val[0]
        m.value[1]=prop_val[1]
      }
      showValue() // draw the range slider with knob(s) in position as given by m.value
      colorRange()
      //updateRangeState()
      isReadonly()
    } else
       if (defined(p.value) &&
          (m.value[0]!==prop_val[0] || m.value[1]!==prop_val[1])) {
            //update if new value prop provided
            m.value[0]=prop_val[0]
            m.value[1]=prop_val[1]
            //console.log("     useEffect setting value: ", m.value)
            showValue()
            colorRange()
            //updateRangeState()
       }
  }) //useEffect
  // -- called only upon mounting/unmounting:
  useEffect(() => {
    return () => { //clean-up code only executed on unmounting:
      detachEvents()
    }
  }, []); // note the empty dependency array!

  //console.log(`   .....  JRange render (rebuild: ${m.rebuild}), m.val:`, m.value, '| p.val:', p.value)
  return ( <div class="slider-range-wrap">
     <div ref={domRef} class="slider-container">
			  <div class="back-bar">
          <div class="selected-bar"></div>
          <div class="pointer low"></div><div class="pointer-label low"></div>
          <div class="pointer high"></div><div class="pointer-label high"></div>
          <div class="clickable-bar"></div>
        </div>
      <div class="scale"></div>
	  </div>
  </div> )

}

