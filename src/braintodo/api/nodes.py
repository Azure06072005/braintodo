from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from braintodo.graph.base import GraphStore, NodeNotFoundError
from braintodo.graph.neo4j_store import Neo4jGraphStore
from braintodo.models.node import Node, NodeCreate, NodeUpdate

router = APIRouter(prefix="/nodes", tags=["nodes"])


@lru_cache
def _default_store() -> Neo4jGraphStore:
    return Neo4jGraphStore()


def get_store() -> GraphStore:
    """Real production backend. Tests override this with InMemoryGraphStore
    via app.dependency_overrides[get_store]."""
    return _default_store()


def close_default_store() -> None:
    """Closes the singleton Neo4j driver, if one was ever created. Called from
    the app's lifespan shutdown hook so the driver isn't left dangling."""
    if _default_store.cache_info().currsize:
        _default_store().close()
    _default_store.cache_clear()


@router.post("", response_model=Node, status_code=201)
def create_node(data: NodeCreate, store: Annotated[GraphStore, Depends(get_store)]) -> Node:
    return store.create_node(data)


@router.get("", response_model=list[Node])
def list_nodes(store: Annotated[GraphStore, Depends(get_store)]) -> list[Node]:
    return store.list_nodes()


@router.get("/{node_id}", response_model=Node)
def get_node(node_id: str, store: Annotated[GraphStore, Depends(get_store)]) -> Node:
    try:
        return store.get_node(node_id)
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{node_id}", response_model=Node)
def update_node(
    node_id: str, data: NodeUpdate, store: Annotated[GraphStore, Depends(get_store)]
) -> Node:
    try:
        return store.update_node(node_id, data)
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{node_id}", status_code=204)
def delete_node(node_id: str, store: Annotated[GraphStore, Depends(get_store)]) -> None:
    try:
        store.delete_node(node_id)
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
