import React, { useRef } from "react";
import './App.css';

function App() {
  const svgRef = useRef();

  const width = 1440; //1440 × 2560
  const height = 1440;

  return (
    <div className="App">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}

export default App;
