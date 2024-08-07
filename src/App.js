import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./App.css";
import { useParams } from "react-router-dom";

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
          const response = await fetch(
            `http://113.198.85.6/api/graphData/${dbName}`
          );
          if (!response.ok) {
            throw new Error("Network response was not ok");
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

    // "텍스트", "방향", "플래시"라는 타입을 제외한 링크 필터링
    const links = graphData.links.filter(
      (link) =>
        link.type !== "텍스트" &&
        link.type !== "방향" &&
        link.type !== "플래시" &&
        link.type !== "해상도" &&
        link.type !== "형식화된 주소" &&
        link.type !== "밤/낮" &&
        link.type !== "우편번호" &&
        link.type !== "건물" &&
        link.type !== "년"
    );

    // 활성화된 링크에서 사용되는 모든 노드 ID 수집
    const nodeIds = new Set(
      links.flatMap((link) => [link.source, link.target])
    );

    // 활성화된 노드만 필터링
    const nodes = graphData.nodes.filter((node) => nodeIds.has(node.id));

    // 노드 데이터를 정리한 후, 링크 데이터에서 참조하는 source와 target을 객체로 변환
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    links.forEach((link) => {
      link.source = nodeById.get(link.source);
      link.target = nodeById.get(link.target);
    });

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
      .force("charge", d3.forceManyBody().strength(-2000))
      .force("collide", d3.forceCollide(50)) //.strength(0.7))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // SVG 내부를 초기화하여 이전 그래프 제거
    d3.select(svgRef.current).selectAll("*").remove();

    // 시뮬레이션을 100번 사전 실행
    for (let i = 0; i < 100; ++i) simulation.tick();

    const svg = d3.select(svgRef.current);

    svg
      //.attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    //줌 대상이 될 g 요소를 추가
    const g = svg.append("g");

    // g 요소에 zoom 기능을 적용
    const zoomed = (event) => {
      g.attr("transform", event.transform);
    };

    //zoom 기능 정의. scaleExtent 부분을 수정하여 zoom의 한계를 조정할 수 있음
    const zoom = d3.zoom().scaleExtent([0.1, 8]).on("zoom", zoomed);

    // 확대 배율
    const scale = 0.15;
    // const initialX = (width / 2) * (1 - 1 / scale);
    // const initialY = (height / 2) * (1 - 1 / scale);

    // 초기 확대 배율을 설정하고, 중심 위치를 조정
    const initialTransform = d3.zoomIdentity
      .translate((width / 2) * (1 - scale), (height / 2) * (1 - scale))
      // .translate(initialX, initialY)
      .scale(scale);

    // svg 요소에 초기 변환을 적용
    svg.call(zoom.transform, initialTransform);

    // svg에 zoom 기능을 적용, 하지만 실제 변환은 g 요소에 적용됨
    svg.call(zoom);

    // 각 링크에 대한 path 생성
    const linkPath = g
      .append("g")
      .selectAll(".link")
      .data(links)
      .enter()
      .append("path")
      .attr("id", (d, i) => `linkPath-${i}`)
      .attr(
        "d",
        (d) => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`
      )
      .attr("stroke", "#999")
      .attr("fill", "none");

    // First, create the rectangles for the link backgrounds
    const linkBackgrounds = g
      .append("g")
      .selectAll(".link-background")
      .data(links)
      .enter()
      .append("rect")
      .attr("class", "link-background")
      //.attr("width", 60)
      //.attr("height", 5)
      .attr("fill", "white"); // Background color same as the link stroke
    // Other attributes like x, y, width, and height will be set in the tick function

    // 각 링크의 텍스트를 위한 text 요소 생성
    const linkLabels = g
      .append("g")
      .selectAll(".link-label")
      .data(links)
      .enter()
      .append("text")
      .style("text-anchor", "middle")
      .style("fill", "green")
      .append("textPath") // textPath를 사용하여 path 위에 텍스트를 놓음
      .attr("xlink:href", (d, i) => `#linkPath-${i}`) // 해당 링크의 path ID를 참조
      .attr("startOffset", "50%") // 선의 가운데에 텍스트가 오도록 설정
      .text((d) => d.type);

    const linkHoverLine = g
      .append("g")
      .selectAll(".link-hover")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link-hover")
      .attr("id", (d) => `link-${d.id}`) // 데이터를 기반으로 ID 설정
      .attr("stroke-width", 8) // 충분히 넓게 만들어 사용자가 쉽게 호버할 수 있게 합니다.
      .attr("stroke", "transparent") // 기본적으로 보이지 않게 만듭니다.
      .attr("fill", "none")
      // .on("mouseover", function (event, d) { //이거는 모바일에서 필요 없는 기능임
      //   // 호버 시 보이는 스타일을 적용합니다.
      //   d3.select(this).attr("stroke", "rgba(21, 169, 255, 0.5)");
      // })
      // .on("mouseout", function (event, d) {
      //   // 호버가 끝나면 원래 상태로 돌립니다.
      //   d3.select(this).attr("stroke", "transparent");
      // })
      .on("click", function (event, d) {
        // 클릭 시 상태를 토글합니다.
        const isActive = d3.select(this).classed("active");
        d3.select(this).classed("active", !isActive);
        d3.select(this).attr(
          "stroke",
          isActive ? "transparent" : "rgba(21, 169, 255, 0.5)"
        );
      });

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
      .attr("fill", "#68c2a3")
      .on("click", handleNodeClick); // 공통 클릭 이벤트 적용

    //이미지에 테두리를 추가하기 위한 사각형 노드
    node
      .filter((d) => d.group === 0) // group 값이 0인 노드만 필터링 사진 노드
      .append("rect")
      .attr("x", -35)
      .attr("y", -35)
      .attr("width", 70)
      .attr("height", 70)
      //.style("stroke", "rgba(255, 34, 34, 0.5)") // 초기 테두리 스타일 지정
      .style("stroke-width", "8px")
      .style("fill", "rgba(255, 34, 34, 0.5)")
      .style("visibility", "hidden") // 처음에는 테두리를 숨김
      .attr("class", "image-border"); // 클래스 이름 추가

    node
      .filter((d) => d.group === 0) // group 값이 0인 노드만 필터링 사진 노드
      .append("image")
      .attr("href", (d) => `/images/${dbName}/${d.label}`) // 서버의 public/images/${dbName} 위치에 있는 사진
      .attr("x", -30)
      .attr("y", -30)
      .attr("width", 60)
      .attr("height", 60)
      .on("click", handleNodeClick); // 공통 클릭 이벤트 적용

    //테두리 적용 코드
    function handleNodeClick(event, d) {
      setSelectedNode(d); // 클릭된 노드의 데이터를 상태에 저장

      // 모든 노드의 하이라이트 클래스를 제거합니다.
      d3.selectAll(".node circle").classed("highlight", false);
      d3.selectAll(".node .image-border").style("visibility", "hidden");

      // 클릭된 노드가 이미지 노드인 경우
      if (d.group === 0) {
        // 이미지 노드의 테두리 표시
        d3.select(event.currentTarget.parentNode)
          .select(".image-border")
          .style("visibility", "visible");
      } else {
        // 일반 노드(원)의 하이라이트 클래스 적용
        d3.select(event.currentTarget).classed("highlight", true);
      }

      // 연결된 모든 링크의 색상을 토글합니다.
      d3.selectAll(".link-hover").each(function (linkData) {
        if (linkData.source.id === d.id || linkData.target.id === d.id) {
          const isActive = d3.select(this).classed("active");
          // 이미 활성화된 링크는 변경하지 않고, 비활성 상태인 링크만 활성화합니다.
          if (!isActive) {
            d3.select(this).classed("active", true);
            d3.select(this).attr("stroke", "rgba(21, 169, 255, 0.5)");
          }
        } else {
          d3.select(this).classed("active", false);
          d3.select(this).attr("stroke", "transparent");
        }
      });
    }

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

    // 클릭 이벤트 핸들러. 안드로이드와 통신하기 위해
    function handleClick(event, d) {
      console.log(d.label);
      setSelectedNode(d); // 클릭된 노드의 데이터를 상태에 저장

      if (window.Android && window.Android.receivePhotoName) {
        window.Android.receivePhotoName(d.label); // d.label은 클릭된 노드의 사진 이름
        //window.Android.receivePhotoName('20240229_175347'); //이건 테스트 헤보는 코드
      } else {
        console.log("Android interface not found. ");
      }
    }

    simulation.on("tick", tick);
    function tick() {
      // 링크의 path를 업데이트
      linkPath.attr("d", (d) => {
        // 왼쪽에서 오른쪽으로 선을 그리도록 시작점과 끝점을 결정합니다.
        const x1 = d.source.x < d.target.x ? d.source.x : d.target.x;
        const x2 = d.source.x < d.target.x ? d.target.x : d.source.x;
        const y1 = d.source.x < d.target.x ? d.source.y : d.target.y;
        const y2 = d.source.x < d.target.x ? d.target.y : d.source.y;
        return `M${x1},${y1} L${x2},${y2}`;
      });

      // Define the size of the background rectangle based on your text size
      const rectWidth = 40; // Adjust as needed
      const rectHeight = 2; // Adjust as needed

      linkBackgrounds
        .attr("x", (d) => (d.source.x + d.target.x) / 2 - rectWidth / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2 - rectHeight / 2)
        .attr("width", rectWidth)
        .attr("height", rectHeight)
        .attr("transform", (d) => {
          const angle =
            (Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) *
              180) /
            Math.PI;
          const xMid = (d.source.x + d.target.x) / 2;
          const yMid = (d.source.y + d.target.y) / 2;
          return `rotate(${angle},${xMid},${yMid})`;
        });

      // link text의 위치와 방향을 업데이트
      // textPath 요소의 위치를 업데이트합니다. (시작점과 끝점을 고려)
      linkLabels
        .attr("startOffset", "50%")
        .style("text-anchor", "middle")
        .attr("transform", (d) => {
          // 선이 왼쪽에서 오른쪽으로 그려져야 한다면 텍스트를 회전시킵니다.
          if (d.source.x > d.target.x) {
            // 회전의 중심점을 계산합니다.
            const x = (d.source.x + d.target.x) / 2;
            const y = (d.source.y + d.target.y) / 2;
            return `rotate(180, ${x}, ${y})`;
          } else {
            return ""; // 필요 없는 경우 회전시키지 않습니다.
          }
        });

      // g 요소의 위치를 업데이트합니다.
      node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

      linkHoverLine.attr(
        "d",
        (d) => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`
      );
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
      //null값을 주면 위치 고정 안됨
      //event.subject.fx = null;
      //event.subject.fy = null;
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    // Cleanup on component unmount
    return () => simulation.stop();
  }, [dbName, graphData]);

  return (
    <div className="App">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}

export default App;
