from fastapi import APIRouter, Depends

from braintodo.api.auth import get_current_user
from braintodo.api.edges import get_edge_repository
from braintodo.api.nodes import get_node_repository, get_store
from braintodo.db.models import User
from braintodo.graph.base import GraphStore, NodeNotFoundError
from braintodo.graph.repository import EdgeRepository, NodeRepository
from braintodo.models.edge import EdgeCreate
from braintodo.models.graph import GraphExport, GraphImportResult
from braintodo.models.node import NodeCreate
from braintodo.realtime.manager import ConnectionManager, get_manager

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/export", response_model=GraphExport)
async def export_graph(
    store: GraphStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> GraphExport:
    nodes = await store.list_nodes(str(current_user.id))
    edges = await store.list_edges(str(current_user.id))
    return GraphExport(nodes=nodes, edges=edges)


@router.post("/import", response_model=GraphImportResult)
async def import_graph(
    data: GraphExport,
    node_repo: NodeRepository = Depends(get_node_repository),
    edge_repo: EdgeRepository = Depends(get_edge_repository),
    manager: ConnectionManager = Depends(get_manager),
    current_user: User = Depends(get_current_user),
) -> GraphImportResult:
    owner_id = str(current_user.id)
    id_map: dict[str, str] = {}
    for node in data.nodes:
        created = await node_repo.create(
            NodeCreate(
                title=node.title,
                content=node.content,
                tags=node.tags,
                weight=node.weight,
                color=node.color,
                shape=node.shape,
                size=node.size,
            ),
            owner_id,
        )
        id_map[node.id] = created.id

    edges_created = 0
    edges_skipped = 0
    for edge in data.edges:
        source_id = id_map.get(edge.source_id)
        target_id = id_map.get(edge.target_id)
        if source_id is None or target_id is None:
            edges_skipped += 1
            continue
        try:
            await edge_repo.create(
                EdgeCreate(
                    source_id=source_id,
                    target_id=target_id,
                    relation_type=edge.relation_type,
                    color=edge.color,
                    style=edge.style,
                ),
                owner_id,
            )
            edges_created += 1
        except NodeNotFoundError:
            edges_skipped += 1

    result = GraphImportResult(
        nodes_created=len(id_map),
        edges_created=edges_created,
        edges_skipped=edges_skipped,
    )

    await manager.broadcast("graph_imported", result.model_dump(), owner_id)
    return result
