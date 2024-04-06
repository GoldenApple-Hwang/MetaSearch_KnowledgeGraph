import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import './App.css';
import { useParams } from 'react-router-dom';

function App() {
  
  const svgRef = useRef();
  
  const width = 1440; //1440 × 2560
  const height = 1440;
  
  const { dbName } = useParams();
  console.log(dbName);
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] }); // neo4j에서 그래프를 그릴 데이터를 받아와서 저장

  useEffect(() => {
    // dbName 값이 설정된 경우에만 데이터를 가져옴
  if (dbName) {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://223.194.154.167/api/graphData/${dbName}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setGraphData(data);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };
  
    fetchData();
  }
  }, [dbName]);

  return (
    <div className="App">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}

export default App;
