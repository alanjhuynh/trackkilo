import React from "react";
import { createContext, useState, useEffect } from "react";

const LiftContext = createContext([]);

function LiftProvider(props) {
  const [lifts, setLifts] = useState([]);
  return (
    <LiftContext.Provider value={[lifts, setLifts]} >
      {props.children}
    </LiftContext.Provider>
  );
}

export { LiftProvider, LiftContext };