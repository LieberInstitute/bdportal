import $ from 'jquery'

const tooltipOpts={ delay: { show: 800, hide: 100 }, placement:'auto', trigger: 'hover', container: 'body'  }
const ttSel='[data-toggle="tooltip"]'
//should be called on first render useEffect( , [])

export function setupTooltips(eldom) {  
  if (eldom && $(eldom).length==0) return
  const jqs=eldom ? $(eldom).find(ttSel).addBack(ttSel) 
                    : $(ttSel)
  if (!jqs.length) return
  jqs.tooltip(tooltipOpts)
  jqs.on('click.hint', (e) => {
          const t=$(e.target)
          t.tooltip('hide')
          setTimeout( () => { if ($(e.target).length) {
                               $(e.target).tooltip( tooltipOpts ) 
                            }
                         }, 1000 )
     })
}
export function clearTooltips(eldom) {
  
  if (eldom && $(eldom).length==0) return
  const jqs=eldom ? $(eldom).find(ttSel).addBack(ttSel) 
                    : $(ttSel)
  if (!jqs.length) return
  jqs.tooltip('dispose')
  jqs.off('.hint')
}

export function hideTooltip(eldom) {
  if (!eldom || $(eldom).length==0) return
  $(eldom).tooltip('hide')
  setTimeout( ()=> {
       if ($(eldom).length) setupTooltips(eldom)
    }, 1000)
}