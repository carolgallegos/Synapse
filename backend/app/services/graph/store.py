from typing import Any

import networkx as nx

from app.models.schemas import GraphEdge, GraphNode, NodeKind


KIND_MAP = {
    "service": NodeKind.SERVICE,
    "event": NodeKind.EVENT,
    "deployment": NodeKind.DEPLOYMENT,
    "metric": NodeKind.METRIC,
    "ticket": NodeKind.TICKET,
    "alert": NodeKind.ALERT,
}


class KnowledgeGraph:
    def __init__(self) -> None:
        self._graph = nx.DiGraph()

    @property
    def node_count(self) -> int:
        return self._graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self._graph.number_of_edges()

    def upsert_node(self, node_id: str, label: str, kind: str, metadata: dict[str, Any] | None = None) -> None:
        node_kind = KIND_MAP.get(kind, NodeKind.EVENT)
        existing = self._graph.nodes.get(node_id, {})
        merged_meta = {**existing.get("metadata", {}), **(metadata or {})}
        self._graph.add_node(
            node_id,
            label=label,
            kind=node_kind.value,
            metadata=merged_meta,
        )

    def add_edge(self, source: str, target: str, relation: str, weight: float = 1.0) -> None:
        if source not in self._graph or target not in self._graph:
            return
        if self._graph.has_edge(source, target):
            current = self._graph[source][target]
            current["weight"] = max(current.get("weight", 1.0), weight)
        else:
            self._graph.add_edge(source, target, relation=relation, weight=weight)

    def get_subgraph(self, node_ids: list[str], depth: int = 2) -> tuple[list[GraphNode], list[GraphEdge]]:
        collected: set[str] = set()
        for node_id in node_ids:
            if node_id not in self._graph:
                continue
            collected.add(node_id)
            for _, neighbor in nx.bfs_edges(self._graph, node_id, depth_limit=depth):
                collected.add(neighbor)

        nodes = [
            GraphNode(
                id=node_id,
                label=data.get("label", node_id),
                kind=NodeKind(data.get("kind", NodeKind.EVENT.value)),
                metadata=data.get("metadata", {}),
            )
            for node_id, data in self._graph.nodes(data=True)
            if node_id in collected
        ]
        edges = [
            GraphEdge(source=u, target=v, relation=data.get("relation", "related"), weight=data.get("weight", 1.0))
            for u, v, data in self._graph.edges(data=True)
            if u in collected and v in collected
        ]
        return nodes, edges

    def find_paths(self, source: str, target: str, max_paths: int = 3) -> list[list[str]]:
        if source not in self._graph or target not in self._graph:
            return []
        paths: list[list[str]] = []
        for path in nx.all_simple_paths(self._graph, source, target, cutoff=6):
            paths.append(path)
            if len(paths) >= max_paths:
                break
        return paths

    def downstream(self, node_id: str) -> list[str]:
        if node_id not in self._graph:
            return []
        return list(nx.descendants(self._graph, node_id))

    def match_topology(self, seed_nodes: list[str]) -> float:
        if not seed_nodes:
            return 0.0
        overlap = sum(1 for node in seed_nodes if node in self._graph)
        return overlap / len(seed_nodes)


graph_store = KnowledgeGraph()
