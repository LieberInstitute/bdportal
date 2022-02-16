import React, {createContext, useContext, useState } from "react";

const MxSelCtx = createContext();
const MxSelUpdateCtx = createContext();

export function useMxSel() {  return useContext(MxSelCtx) }
export function useMxSelUpdate() {  return useContext(MxSelUpdateCtx) }

export function MxSelProvider( {children} ) {
  //                                  selcol, selregs, mxVals, dtXsel  
  const [rSelData, setMxSel] = useState([ 0,    [],      [],   [] ])
  function updateMxSel(rsel_data) { setMxSel(rsel_data)  }
  
  return (
    <MxSelCtx.Provider value={rSelData}>
      <MxSelUpdateCtx.Provider value={updateMxSel}>
      {children}
      </MxSelUpdateCtx.Provider>
    </MxSelCtx.Provider>
  );
};

