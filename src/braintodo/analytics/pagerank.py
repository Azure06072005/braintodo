import networkx as nx

_DAMPING = 0.85
_MAX_ITER = 100
_TOLERANCE = 1e-6


def pagerank(graph: nx.Graph) -> dict[str, float]:
    """Standard power-iteration PageRank over an undirected graph.

    networkx.pagerank() requires scipy, which isn't otherwise a project
    dependency - pulling it in just for this one function isn't worth it,
    so this is a small, self-contained implementation instead.
    """
    nodes = list(graph.nodes())
    n = len(nodes)
    if n == 0:
        return {}

    rank = {node: 1.0 / n for node in nodes}

    for _ in range(_MAX_ITER):
        dangling_sum = sum(
            rank[node] for node in nodes if graph.degree(node) == 0
        )
        new_rank: dict[str, float] = {}
        for node in nodes:
            incoming = sum(
                rank[neighbor] / graph.degree(neighbor)
                for neighbor in graph.neighbors(node)
            )
            new_rank[node] = (1 - _DAMPING) / n + _DAMPING * (
                incoming + dangling_sum / n
            )

        delta = sum(abs(new_rank[node] - rank[node]) for node in nodes)
        rank = new_rank
        if delta < _TOLERANCE:
            break

    return rank