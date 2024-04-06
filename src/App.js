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

  // 이 코드는 그래프를 그리는 코드
  useEffect(() => {
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const links = graphData.links.map((d) => ({ ...d }));
    const nodes = graphData.nodes.map((d) => ({ ...d }));
    console.log(links);
    console.log(nodes);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id) //.distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collide", d3.forceCollide(10)) //.strength(0.7))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    const svg = d3.select(svgRef.current);

    svg
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 15)
      .attr("fill", (d) => color(d.group))
      .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
  
        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
  
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
  
      //이걸 안하면 위치 고정 되는 듯
  
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

    // Cleanup on component unmount
    return () => simulation.stop();
  }, [graphData]);

  return (
    <div className="App">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}

export default App;
