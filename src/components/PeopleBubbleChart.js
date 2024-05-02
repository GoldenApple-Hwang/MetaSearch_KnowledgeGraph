import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const BubbleChart = ({ data }) => {
  console.log(data);
  const ref = useRef();

  useEffect(() => {
    if (data.length > 0) {
      drawChart();
    }
  }, [data]);

  const drawChart = () => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove(); // 기존 차트를 지웁니다.

    const width = 1000;
    const height = 800;

    svg.attr("width", width).attr("height", height);

    const container = svg.append("g"); // 모든 그래픽 요소를 포함할 컨테이너

    const zoom = d3.zoom()
      .scaleExtent([0.1, 5]) // 줌 스케일 제한
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom); // 줌 기능을 SVG에 적용

    // 초기 줌 설정을 적용
    // const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.75);
    // svg.call(zoom.transform, initialTransform);

    const simulation = d3
      .forceSimulation(data)
      .force("charge", d3.forceManyBody().strength(-200)) // 마이너스면 서로 밀어내는 힘
      .force("center", d3.forceCenter(width / 2, height / 2)) // 화면 중앙으로 끌어당기는 힘
      .force(
        "collision",
        d3.forceCollide().radius((d) => d.frequency * 10 + 3)
      ) // 노드 간 충돌 방지
      .force("x", d3.forceX(width / 2).strength(0.2)) // X축 중앙으로 강력하게 끌어당김
      .force("y", d3.forceY(height / 2).strength(0.2)); // Y축 중앙으로 강력하게 끌어당김
    // 충돌 방지 힘 적용, 각 노드 간격 조정

    const dragHandler = d3
      .drag()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; // 고정 위치를 현재 위치로 설정
        d.fy = d.y;
      })
      .on("drag", function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; // 고정 위치 해제
        d.fy = null;
      });

    const minRadius = 5; // 최소 반지름 설정

    const nodes = container
    //.append("g")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("r", (d) => Math.max(d.frequency * 10, minRadius)) // 최소 반지름 이상으로 설정
    .attr("fill", (d, i) => {
      // 야간 파스텔 톤의 색상 계산
      const hue = (i / data.length) * 360;
      // HSL 색상 모델로 부드러운 야간 파스텔 톤 설정 (톤 조정 가능)
      return `hsl(${hue}, 90%, 50%)`; // 60%의 채도와 40%의 밝기
    })
    .attr("fill-opacity", 0.5);  // 반투명효과를 위해 투명도 설정

    // const maxFrequency = data[0].frequency;

    // const minRadius = 5; // 최소 반지름 설정

    // const minOpacity = 0.2; // 최소 투명도 설정
    // const colorBase = 180; // 색상 기본값을 밝은 톤으로 설정
    
    // const nodes = svg
    //   .append("g")
    //   .selectAll("circle")
    //   .data(data)
    //   .enter()
    //   .append("circle")
    //   .attr("r", (d) => Math.max(d.frequency * 10, minRadius)) // 최소 반지름 이상으로 설정
    //   .attr("fill", (d) => {
    //     const opacity = Math.pow(d.frequency / maxFrequency, 2) * (1 - minOpacity) + minOpacity; // 최소 투명도 보장
    //     return `rgba(${colorBase}, 100, ${colorBase}, ${opacity})`; // 색상과 투명도 조절
    //   })
    //   .attr("fill-opacity", 0.9); // 전체적인 반투명 효과 조정
      
    // 텍스트 레이블 추가
    const labels = container
      //.append("g")
      .selectAll("text")
      .data(data)
      .enter()
      .append("text")
      // .text(`인물 ${i++}`) // 엔티티 이름 표시
      .text((d) => d.entity) // 엔티티 이름 표시
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", (d) => `${Math.max(7, d.frequency*2)}px`) // 최소 크기를 12px로 설정
      .style("font-family", "Arial");

    dragHandler(nodes);

    simulation.on("tick", () => {
      nodes.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      labels.attr("x", (d) => d.x).attr("y", (d) => d.y + 5); // 레이블 위치 조정
    });
  };

  return <svg ref={ref}></svg>;
};

export default BubbleChart;
