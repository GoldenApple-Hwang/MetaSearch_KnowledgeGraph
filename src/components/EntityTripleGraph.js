import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useNavigate } from "react-router-dom";

const EntityTripleGraph = ({ data, dbName }) => {
  const svgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null); // 클릭된 노드 데이터 저장
  const navigate = useNavigate(); // navigate 함수 사용

  const width = 800; //1440 × 2560
  const height = 600;

  // 데이터 가공을 위한 useEffect
  useEffect(() => {
    if (!data || !data.links || !data.nodes) {
      return;
    }

    const { links: rawLinks, nodes: rawNodes } = data;

    const links = rawLinks.filter(
      (link) =>
        link.type !== "텍스트" && link.type !== "방향" && link.type !== "플래시"
    );
    const nodeIds = new Set(
      links.flatMap((link) => [link.source, link.target])
    );
    const nodes = rawNodes.filter((node) => nodeIds.has(node.id));

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    links.forEach((link) => {
      link.source = nodeById.get(link.source);
      link.target = nodeById.get(link.target);
    });

    console.log(nodes);
    console.log(links);

    setGraphData({ nodes, links });
  }, [data]);

  // D3 시각화를 위한 useEffect
  useEffect(() => {
    if (!graphData.nodes.length || !graphData.links.length) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // 이전 그래프 요소들 제거

    const { nodes, links } = graphData;

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(200)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("charge", d3.forceManyBody().strength(-1500))
      .force("collide", d3.forceCollide(50).strength(0.7))
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .alphaTarget(0.3)
      .alphaDecay(0.05);

    // 시뮬레이션을 300번 사전 실행
    for (let i = 0; i < 10; ++i) simulation.tick();

    // svg
    //   .attr("viewBox", [-width / 2, -height / 2, width, height])
    //   .attr("style", "max-width: 100%; height: auto;");

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
      .attr("fill", "white");

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

    const node = g
      .append("g")
      //.attr("stroke", "white") //"(d) => color(d.group)"
      //.attr("stroke-width", (d) => Math.sqrt(d.value));
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(drag(simulation));

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

    //node에 label 추가
    node
      .filter((d) => d.group !== 0) //사진이 아닌 노드
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .style("fill", "black")
      .attr("font-size", 15)
      .on("click", handleNodeClick);

    function drag(simulation) {
      return d3
        .drag()
        .on("start", (event) => {
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
          simulation.alphaTarget(0.3).restart();
        })
        .on("drag", (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on("end", (event) => {
          event.subject.fx = null;
          event.subject.fy = null;
          simulation.alphaTarget(0);
        });
    }

    //안드로이드와 통신 할 함수
    function sendLabelToAndroid(event, d) {
      console.log(`사진 노드 ${d.label}`);

      if (window.Android && window.Android.receivePhotoName) {
        window.Android.receivePhotoName(d.label); // d.label은 클릭된 노드의 사진 이름
      } else {
        console.log("Android interface not found. ");
      }
    }

    //노드를 클릭했을 때 함수
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

        sendLabelToAndroid(event, d); // 안드로이드와 통신 할 함수
      } else if (event.target.tagName === "text") {
        const parentNode = d3.select(event.target.parentNode);
        parentNode.classed("highlight", true); // 부모 노드에 하이라이트 적용
        d3.select(event.target).style("stroke", "none"); // 텍스트의 스트로크를 없애기
      } else {
        // 일반 노드(원)의 하이라이트 클래스 적용
        d3.select(event.currentTarget).classed("highlight", true);
      }

      // 클릭된 노드를 화면의 중앙으로 부드럽게 이동시키고 확대
      const scale = 1.5; // 확대할 스케일
      const x = width / 2 - d.x * scale;
      const y = height / 2 - d.y * scale;
      const transform = d3.zoomIdentity.translate(x, y).scale(scale);

      svg
        .transition()
        .duration(500)
        .call(zoom.transform, transform)
        .on("end", () => {
          // 페이지 이동 전 줌 상태를 즉시 초기화
          svg.call(zoom.transform, d3.zoomIdentity); // 줌 상태를 즉시 초기화

          // 페이지 이동 실행
          navigate(`/entityTripleGraph/${dbName}/${d.label}`);
        });
    }

    simulation.on("tick", () => {
      // 링크의 path를 업데이트
      linkPath.attr("d", (d) => {
        // 왼쪽에서 오른쪽으로 선을 그리도록 시작점과 끝점을 결정합니다.
        const x1 = d.source.x < d.target.x ? d.source.x : d.target.x;
        const x2 = d.source.x < d.target.x ? d.target.x : d.source.x;
        const y1 = d.source.x < d.target.x ? d.source.y : d.target.y;
        const y2 = d.source.x < d.target.x ? d.target.y : d.source.y;
        return `M${x1},${y1} L${x2},${y2}`;
      });

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
    });
  }, [graphData]); // graphData가 변경될 때마다 시각화 로직 실행

  return <svg ref={svgRef} width={width} height={height} />;
};

export default EntityTripleGraph;
