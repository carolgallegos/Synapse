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

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function CausalGraph({ nodes, edges }: Props) {
  const layout = useMemo(() => {
    const layers: Record<string, number> = {
      deployment: 0,
      service: 1,
      event: 2,
      metric: 2,
      ticket: 3,
      alert: 2,
    };

    const sorted = [...nodes].sort(
      (a, b) => (layers[a.kind] ?? 2) - (layers[b.kind] ?? 2) || a.label.localeCompare(b.label),
    );

    const positions: Record<string, { x: number; y: number }> = {};
    const byLayer: Record<number, GraphNode[]> = {};
    sorted.forEach((node) => {
      const layer = layers[node.kind] ?? 2;
      byLayer[layer] = byLayer[layer] ?? [];
      byLayer[layer].push(node);
    });

    Object.entries(byLayer).forEach(([layer, layerNodes]) => {
      const l = Number(layer);
      const x = 80 + l * 170;
      const gap = 340 / (layerNodes.length + 1);
      layerNodes.forEach((node, idx) => {
        positions[node.id] = { x, y: gap * (idx + 1) };
      });
    });

    return positions;
  }, [nodes]);

  if (!nodes.length) {
    return <div className="empty-state">Run an analysis to build the operational graph.</div>;
  }

  return (
    <div className="graph-wrap">
      <svg className="graph-svg" viewBox="0 0 720 340">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6b7280" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const from = layout[edge.source];
          const to = layout[edge.target];
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={`${edge.source}-${edge.target}`}>
              <line className="edge-line" x1={from.x + 70} y1={from.y} x2={to.x - 10} y2={to.y} />
              <text className="edge-label" x={midX} y={midY - 6} textAnchor="middle">
                {edge.relation.replace(/_/g, " ")}
              </text>
            </g>
          );
        })}
        {nodes.map((node) => {
          const pos = layout[node.id];
          if (!pos) return null;
          const color = KIND_COLORS[node.kind] ?? "#94a3b8";
          return (
            <g key={node.id} transform={`translate(${pos.x - 60}, ${pos.y - 24})`}>
              <rect className="node-card" width="120" height="48" rx="8" stroke={color} />
              <text className="node-kind" x="60" y="16" textAnchor="middle">
                {node.kind}
              </text>
              <text className="node-label" x="60" y="34" textAnchor="middle">
                {node.label.length > 16 ? `${node.label.slice(0, 14)}…` : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
