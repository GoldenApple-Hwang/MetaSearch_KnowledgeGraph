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

  const [selectedNode, setSelectedNode] = useState(null); // 클릭된 노드 데이터 저장

  useEffect(() => {
    // dbName 값이 설정된 경우에만 데이터를 가져옴
    if (dbName) {
      const fetchData = async () => {
        try {
          const response = await fetch(`http://223.194.155.47/api/graphData/${dbName}`);
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
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(200)
      )
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("collide", d3.forceCollide(50)) //.strength(0.7))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // SVG 내부를 초기화하여 이전 그래프 제거
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);

    svg
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    //줌 대상이 될 g 요소를 추가
    const g = svg.append("g");

    // g 요소에 zoom 기능을 적용
    const zoomed = (event) => {
      g.attr("transform", event.transform);
    };

    //zoom 기능 정의. scaleExtent 부분을 수정하여 zoom의 한계를 조정할 수 있음
    const zoom = d3.zoom().scaleExtent([0.1, 8]).on("zoom", zoomed);

    // svg에 zoom 기능을 적용, 하지만 실제 변환은 g 요소에 적용됨
    svg.call(zoom);

    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);

    //link에 label 추가
    const linkText = g
      .append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .text((d) => d.type)
      .style("fill", "red")
      .attr("font-size", 15)
      //.attr("dx", 50) // 링크 중간보다 약간 오프셋을 주기 위해 조정
      .attr("dy", ".35em");
    //.attr("startOffset", "50%");

    const node = g
      .append("g")
      //.attr("stroke", "white") //"(d) => color(d.group)"
      //.attr("stroke-width", (d) => Math.sqrt(d.value));
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );


    node
      .filter((d) => d.group !== 0) //사진 노드가 아닌 노드
      .append("circle") //이 노드는 그냥 원으로 표현
      .attr("r", 30)
      .attr("fill", (d) => color(d.group));

    node
      .filter((d) => d.group === 0) // group 값이 0인 노드만 필터링
      .append("image")
      .attr("href", "https://i.ibb.co/X75tPzm/image.jpg") // 임시로 넣어놓은 사진 나중에 변경 필요
      .attr("x", -35)
      .attr("y", -35)
      .attr("width", 60)
      .attr("height", 60);

    //node에 label 추가
    node
      .filter((d) => d.group !== 0) //사진이 아닌 노드
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .style("fill", "black")
      .attr("font-size", 15);

    // 사진 노드에 클릭 이벤트를 별도로 추가
    node.filter((d) => d.group === 0).on("click", handleClick);

    // 클릭 이벤트 핸들러
    function handleClick(event, d) {
      console.log(d.label);
      setSelectedNode(d); // 클릭된 노드의 데이터를 상태에 저장

      if (window.Android && window.Android.receivePhotoName) {
        window.Android.receivePhotoName(d.label); // d.label은 클릭된 노드의 사진 이름
        //window.Android.receivePhotoName('20240229_175347'); //이건 테스트 헤보는 코드
      } else {
        console.log("Android interface not found. ")
      }
    }
    
    simulation.on("tick", tick);
    function tick() {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      // link text의 positions 업데이트
      linkText
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      // g 요소의 위치를 업데이트합니다.
      node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    }

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      //null값을 주면 위치 고정 됨
      //event.subject.fx = null;
      //event.subject.fx = null;
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
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
