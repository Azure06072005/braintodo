from braintodo.realtime.manager import ConnectionManager, get_manager

@router.post("/import", response_model=GraphImportResult)
async def import_graph(
    data: GraphExport, 
    node_repo: NodeRepository = Depends(get_node_repository),
    edge_repo: EdgeRepository = Depends(get_edge_repository),
    manager: ConnectionManager = Depends(get_manager),
) -> GraphImportResult: 
    ...
    result = GraphImportResult(
        node_created=len(id_map), 
        edges_created=edges_created,
        edges_skipped=edges_skipped
    )

    await manager.broadcast("graph_imported", result.model_dump())
    return result