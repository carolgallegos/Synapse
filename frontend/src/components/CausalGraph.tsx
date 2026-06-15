import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphEdge, GraphNode } from "../api";

const KIND_COLORS: Record<string, string> = {
  deployment: "#f59e0b",
  service: "#38bdf8",
  event: "#a78bfa",
  metric: "#34d399",
  ticket: "#f87171",
  alert: "#fb7185",
};

const STORY_ORDER = [
  "deployment:deployment-v4-2",
  "service:authentication-service",
  "event:latency-spike",
  "event:login-failure",
  "event:ticket",
  "event:complaint",
];

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
}

function wrapLabel(label: string, max = 18): string[] {
  if (label.length <= max) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function buildLayout(displayNodes: GraphNode[]) {
  const positions: Record<string, { x: number; y: number }> = {};
  const gap = 108;
  const startX = 60;
  displayNodes.forEach((node, idx) => {
    positions[node.id] = { x: startX + idx * gap, y: 150 };
  });
  return positions;
}

export function CausalGraph({ nodes, edges, selectedNodeId, onNodeSelect }: Props) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState(1);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const drag = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const story = useMemo(() => {
    const ordered = STORY_ORDER.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as GraphNode[];
    const displayNodes = ordered.length >= 4 ? ordered : nodes;

    const edgeMap = new Map(edges.map((e) => [`${e.source}|${e.target}`, e.relation]));
    const storyEdges = displayNodes.slice(0, -1).map((node, idx) => {
      const next = displayNodes[idx + 1];
      const relation =
        edgeMap.get(`${node.id}|${next.id}`) ??
        edges.find((e) => e.source === node.id && e.target === next.id)?.relation ??
        "leads to";
      return { source: node.id, target: next.id, relation };
    });

    return { displayNodes, storyEdges };
  }, [nodes, edges]);

  useEffect(() => {
    setPositions(buildLayout(story.displayNodes));
    setZoom(1);
  }, [story.displayNodes]);

  function resetLayout() {
    setPositions(buildLayout(story.displayNodes));
    setActiveNode(null);
    setZoom(1);
  }

  function clientToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x / zoom, y: local.y / zoom };
  }

  function onNodePointerDown(nodeId: string, event: React.PointerEvent) {
    event.stopPropagation();
    const pos = positions[nodeId];
    if (!pos) return;
    const svgPoint = clientToSvg(event.clientX, event.clientY);
    drag.current = {
      nodeId,
      startX: svgPoint.x,
      startY: svgPoint.y,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
    setActiveNode(nodeId);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSvgPointerMove(event: React.PointerEvent) {
    if (!drag.current) return;
    const svgPoint = clientToSvg(event.clientX, event.clientY);
    const dx = svgPoint.x - drag.current.startX;
    const dy = svgPoint.y - drag.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
    setPositions((prev) => ({
      ...prev,
      [drag.current!.nodeId]: {
        x: drag.current!.originX + dx,
        y: drag.current!.originY + dy,
      },
    }));
  }

  function onSvgPointerUp(event: React.PointerEvent) {
    if (drag.current) {
      if (!drag.current.moved) onNodeSelect(drag.current.nodeId);
      event.currentTarget.releasePointerCapture(event.pointerId);
      drag.current = null;
    }
  }

  function onWheel(event: React.WheelEvent) {
    event.preventDefault();
    setZoom((z) => Math.min(1.8, Math.max(0.65, z - event.deltaY * 0.0012)));
  }

  if (!story.displayNodes.length) {
    return <div className="empty-state">Run an analysis to build the operational graph.</div>;
  }

  const xs = Object.values(positions).map((p) => p.x);
  const ys = Object.values(positions).map((p) => p.y);
  const minX = Math.min(...xs, 0) - 80;
  const maxX = Math.max(...xs, 720) + 120;
  const minY = Math.min(...ys, 0) - 60;
  const maxY = Math.max(...ys, 300) + 60;
  const width = maxX - minX;
  const height = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return (
    <div className="graph-wrap">
      <div className="graph-toolbar">
        <span className="graph-hint">Drag nodes · Click to link Splunk evidence · Scroll to zoom</span>
        <div className="graph-toolbar-actions">
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" className="graph-reset" onClick={resetLayout}>
            Reset layout
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="graph-svg"
        viewBox={`${minX} ${minY} ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerLeave={onSvgPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
          </marker>
        </defs>
        <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
          {story.storyEdges.map((edge) => {
            const from = positions[edge.source];
            const to = positions[edge.target];
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const highlighted =
              selectedNodeId === edge.source ||
              selectedNodeId === edge.target ||
              (activeNode && (edge.source === activeNode || edge.target === activeNode));
            return (
              <g key={`${edge.source}-${edge.target}`} className={highlighted ? "edge-active" : undefined}>
                <line
                  className="edge-line edge-line-story"
                  x1={from.x + 52}
                  y1={from.y}
                  x2={to.x - 52}
                  y2={to.y}
                />
                <rect className="edge-label-bg" x={midX - 42} y={midY - 22} width={84} height={18} rx={4} />
                <text className="edge-label edge-label-story" x={midX} y={midY - 10} textAnchor="middle">
                  {edge.relation.replace(/_/g, " ")}
                </text>
              </g>
            );
          })}
          {story.displayNodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const color = KIND_COLORS[node.kind] ?? "#94a3b8";
            const lines = wrapLabel(node.label);
            const isSelected = selectedNodeId === node.id;
            const isActive = activeNode === node.id;
            return (
              <g
                key={node.id}
                className={`graph-node ${isSelected ? "graph-node-selected" : ""} ${isActive ? "graph-node-active" : ""}`}
                transform={`translate(${pos.x - 50}, ${pos.y - 30})`}
                onPointerDown={(e) => onNodePointerDown(node.id, e)}
              >
                <title>{node.label} — click to view Splunk evidence</title>
                <rect className="node-card node-card-story" width="100" height="60" rx="8" stroke={color} />
                <text className="node-kind" x="50" y="16" textAnchor="middle">
                  {node.kind}
                </text>
                {lines.map((line, idx) => (
                  <text key={line} className="node-label" x="50" y={32 + idx * 12} textAnchor="middle">
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
