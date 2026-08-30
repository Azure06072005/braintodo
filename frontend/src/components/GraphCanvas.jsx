import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { theme } from "../theme";
import { usePersonalization } from "../personalization/usePersonalization";

export default function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
  highlightNodeIds, // Set|null — khi có, node ngoài set bị làm mờ
  matchNodeIds, // Set|null — subset của highlightNodeIds khớp trực tiếp từ khoá, viền vàng
  topology, // Map<node_id, NodeTopology>|null — khi có, scale bán kính theo pagerank
  clusters, // Cluster[]|null — khi có, vẽ vùng nền theo cluster_id (FE011)
}) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const { settings } = usePersonalization();
  const glowIntensity = settings?.glowIntensity ?? 0;
  const showCometTrail = settings?.showCometTrail ?? true;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    const nodeData = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(nodeData.map((n) => [n.id, n]));
    const edgeData = edges
      .filter((e) => nodeById.has(e.source_id) && nodeById.has(e.target_id))
      .map((e) => ({ ...e, source: e.source_id, target: e.target_id }));

    // Overlay topology (FE010): bán kính hiển thị = size gốc, phóng to theo
    // pagerank chuẩn hoá (0..1 trong tập node hiện tại) — không sửa `size`
    // gốc của node (đó là thuộc tính do người dùng đặt), chỉ ảnh hưởng lúc vẽ.
    const maxPagerank = topology ? Math.max(...[...topology.values()].map((t) => t.pagerank)) : 0;
    function effectiveRadius(d) {
      const base = d.size || 10;
      if (!topology || maxPagerank === 0) return base;
      const t = topology.get(d.id);
      if (!t) return base;
      const normalized = t.pagerank / maxPagerank;
      return base * (0.7 + normalized * 1.1);
    }
    const topPagerankIds = topology
      ? new Set(
          [...topology.entries()]
            .sort((a, b) => b[1].pagerank - a[1].pagerank)
            .slice(0, 3)
            .map(([id]) => id)
        )
      : new Set();

    const zoomLayer = svg.append("g");
    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on("zoom", (event) => {
        zoomLayer.attr("transform", event.transform);
      })
    );

    // Vùng nền cụm (FE011) — append TRƯỚC edges/nodes để luôn nằm dưới cùng.
    const hullG = zoomLayer.append("g");
    const hullPaths = hullG
      .selectAll("path")
      .data(clusters || [], (d) => d.cluster_id)
      .join("path")
      .attr("fill", (d) => theme.clusterPalette[d.cluster_id % theme.clusterPalette.length])
      .attr("fill-opacity", 0.1)
      .attr("stroke", (d) => theme.clusterPalette[d.cluster_id % theme.clusterPalette.length])
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);
    const hullLabels = hullG
      .selectAll("text")
      .data(clusters || [], (d) => d.cluster_id)
      .join("text")
      .text((d) => d.label || `Cụm ${d.cluster_id}`)
      .attr("fill", (d) => theme.clusterPalette[d.cluster_id % theme.clusterPalette.length])
      .style("font-size", "10.5px")
      .style("font-weight", 600)
      .style("font-family", "sans-serif")
      .style("pointer-events", "none");

    const linkSel = zoomLayer
      .append("g")
      .selectAll("line")
      .data(edgeData)
      .join("line")
      .attr("stroke", (d) => d.color || theme.edge)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", (d) => (d.style === "dashed" ? "4 3" : null));

    const pulseSel = zoomLayer
      .append("g")
      .selectAll("circle")
      .data(edgeData)
      .join("circle")
      .attr("r", 2.5)
      .attr("fill", theme.pulse)
      .attr("opacity", showCometTrail ? 0.85 : 0);

    const nodeSel = zoomLayer
      .append("g")
      .selectAll("g")
      .data(nodeData)
      .join("g")
      .attr("cursor", "grab")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simRef.current.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simRef.current.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (event, d) => onNodeClick(d.id));

    nodeSel
      .append(function (d) {
        const tag = d.shape === "square" ? "rect" : "circle";
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        el.onclick = () => onNodeClick?.(d.id);
        el.addEventListener("click", () => onNodeClick?.(d.id));
        return el;
      })
      .each(function (d) {
        const el = d3.select(this);
        const r = effectiveRadius(d);
        if (d.shape === "square") {
          el.attr("x", -r).attr("y", -r).attr("width", r * 2).attr("height", r * 2).attr("rx", 4);
        } else {
          el.attr("r", r);
        }
      })
      .attr("fill", (d) => d.color || theme.accent)
      .attr("stroke", (d) =>
        topPagerankIds.has(d.id)
          ? theme.importantRing
          : matchNodeIds?.has(d.id)
          ? "#e5b93f"
          : d.id === selectedNodeId
          ? "#ffffff"
          : theme.canvasBg
      )
      .attr("stroke-width", (d) =>
        topPagerankIds.has(d.id) || matchNodeIds?.has(d.id)
          ? 3
          : d.id === selectedNodeId
          ? 2.5
          : 2
      )
      .attr("opacity", (d) => (highlightNodeIds && !highlightNodeIds.has(d.id) ? 0.25 : 1))
      .style("filter", (d) =>
        glowIntensity > 0
          ? `drop-shadow(${theme.glow(d.color || theme.accent, 3 + glowIntensity * 14)})`
          : null
      );

    if (topology) {
      nodeSel.append("title").text((d) => {
        const t = topology.get(d.id);
        if (!t) return d.title;
        return (
          `${d.title}\n` +
          `PageRank: ${t.pagerank.toFixed(3)}\n` +
          `Degree: ${t.degree} (centrality ${t.degree_centrality.toFixed(2)})\n` +
          `Betweenness: ${t.betweenness_centrality.toFixed(3)}`
        );
      });
    }

    nodeSel
      .append("text")
      .text((d) => d.title)
      .attr("x", (d) => effectiveRadius(d) + 6)
      .attr("y", 4)
      .attr("fill", theme.textSecondary)
      .attr("opacity", (d) => (highlightNodeIds && !highlightNodeIds.has(d.id) ? 0.25 : 1))
      .style("font-size", "11px")
      .style("font-family", "sans-serif")
      .style("pointer-events", "none");

    linkSel.attr("opacity", (d) =>
      highlightNodeIds && !(highlightNodeIds.has(d.source_id) && highlightNodeIds.has(d.target_id))
        ? 0.15
        : 1
    );

    // Tính path bao quanh 1 cụm theo vị trí node HIỆN TẠI trong simulation.
    // <3 node -> không dựng được convex hull -> vẽ hình tròn đệm quanh tâm.
    function hullPathFor(cluster) {
      const pts = cluster.node_ids
        .map((id) => nodeById.get(id))
        .filter(Boolean)
        .map((p) => [p.x, p.y]);
      if (pts.length === 0) return "";

      if (pts.length < 3) {
        const cx = d3.mean(pts, (p) => p[0]);
        const cy = d3.mean(pts, (p) => p[1]);
        const maxDist = Math.max(0, ...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy)));
        const r = maxDist + 36;
        return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`;
      }

      const hull = d3.polygonHull(pts);
      if (!hull) return "";
      const centroid = d3.polygonCentroid(hull);
      const padded = hull.map(([x, y]) => {
        const dx = x - centroid[0];
        const dy = y - centroid[1];
        const len = Math.hypot(dx, dy) || 1;
        const pad = 30;
        return [x + (dx / len) * pad, y + (dy / len) * pad];
      });
      return "M" + padded.map((p) => p.join(",")).join("L") + "Z";
    }

    function labelPosFor(cluster) {
      const pts = cluster.node_ids.map((id) => nodeById.get(id)).filter(Boolean);
      if (pts.length === 0) return [0, 0];
      const cx = d3.mean(pts, (p) => p.x);
      const topY = Math.min(...pts.map((p) => p.y));
      return [cx, topY - 44];
    }

    const simulation = d3
      .forceSimulation(nodeData)
      .force(
        "link",
        d3
          .forceLink(edgeData)
          .id((d) => d.id)
          .distance(90)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide((d) => effectiveRadius(d) + 28)
      )
      .on("tick", () => {
        linkSel
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
        nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
        if (clusters) {
          hullPaths.attr("d", hullPathFor);
          hullLabels.attr("x", (d) => labelPosFor(d)[0]).attr("y", (d) => labelPosFor(d)[1]);
        }
      });

    simRef.current = simulation;

    const timer = d3.timer((elapsed) => {
      const t = elapsed / 500;
      pulseSel
        .attr("cx", (d, i) => {
          const f = (Math.sin(t + i) + 1) / 2;
          return d.source.x + (d.target.x - d.source.x) * f;
        })
        .attr("cy", (d, i) => {
          const f = (Math.sin(t + i) + 1) / 2;
          return d.source.y + (d.target.y - d.source.y) * f;
        });
    });

    return () => {
      simulation.stop();
      timer.stop();
    };
  }, [
    nodes,
    edges,
    onNodeClick,
    selectedNodeId,
    highlightNodeIds,
    matchNodeIds,
    topology,
    clusters,
    glowIntensity,
    showCometTrail,
  ]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
    />
  );
}