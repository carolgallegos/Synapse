import { useMemo } from "react";
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

export function CausalGraph({ nodes, edges }: Props) {
  const story = useMemo(() => {
    const ordered = STORY_ORDER.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as GraphNode[];
    const displayNodes = ordered.length >= 4 ? ordered : nodes;

    const positions: Record<string, { x: number; y: number }> = {};
    const gap = 118;
    const startX = 70;
    displayNodes.forEach((node, idx) => {
      positions[node.id] = { x: startX + idx * gap, y: 150 };
    });

    const edgeMap = new Map(edges.map((e) => [`${e.source}|${e.target}`, e.relation]));
    const storyEdges = displayNodes.slice(0, -1).map((node, idx) => {
      const next = displayNodes[idx + 1];
      const relation =
        edgeMap.get(`${node.id}|${next.id}`) ??
        edges.find((e) => e.source === node.id && e.target === next.id)?.relation ??
        "leads to";
      return { source: node.id, target: next.id, relation };
    });

    return { displayNodes, positions, storyEdges };
  }, [nodes, edges]);

  if (!story.displayNodes.length) {
    return <div className="empty-state">Run an analysis to build the operational graph.</div>;
  }

  const width = Math.max(720, story.displayNodes.length * 118 + 80);

  return (
    <div className="graph-wrap">
      <svg className="graph-svg" viewBox={`0 0 ${width} 300`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#65a30d" />
          </marker>
        </defs>
        {story.storyEdges.map((edge) => {
          const from = story.positions[edge.source];
          const to = story.positions[edge.target];
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          return (
            <g key={`${edge.source}-${edge.target}`}>
              <line
                className="edge-line edge-line-story"
                x1={from.x + 52}
                y1={from.y}
                x2={to.x - 52}
                y2={to.y}
              />
              <text className="edge-label edge-label-story" x={midX} y={from.y - 14} textAnchor="middle">
                {edge.relation.replace(/_/g, " ")}
              </text>
            </g>
          );
        })}
        {story.displayNodes.map((node) => {
          const pos = story.positions[node.id];
          if (!pos) return null;
          const color = KIND_COLORS[node.kind] ?? "#94a3b8";
          const lines = wrapLabel(node.label);
          return (
            <g key={node.id} transform={`translate(${pos.x - 50}, ${pos.y - 30})`}>
              <rect className="node-card node-card-story" width="100" height="60" rx="8" stroke={color} />
              <text className="node-kind" x="50" y="16" textAnchor="middle">
                {node.kind}
              </text>
              {lines.map((line, idx) => (
                <text
                  key={line}
                  className="node-label"
                  x="50"
                  y={32 + idx * 12}
                  textAnchor="middle"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
