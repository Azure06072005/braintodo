from fastapi import APIRouter, Depends, HTTPException

from braintodo.api.nodes import get_store
from braintodo.graph.base import EdgeNotFoundError, GraphStore, NodeNotFoundError
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate

router = APIRouter(prefix="/edges", tags=["edges"])


@router.post("", response_model=Edge, status_code=201)
def create_edge(data: EdgeCreate, store: GraphStore = Depends(get_store)) -> Edge:
    try:
        return store.create_edge(data)
    except NodeNotFoundError as exc:
        # Creating an edge against a non-existent node is a bad request from
        # the caller (missing endpoint), not a missing-edge-resource lookup.
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("", response_model=list[Edge])
def list_edges(store: GraphStore = Depends(get_store)) -> list[Edge]:
    return store.list_edges()


@router.get("/{edge_id}", response_model=Edge)
def get_edge(edge_id: str, store: GraphStore = Depends(get_store)) -> Edge:
    try:
        return store.get_edge(edge_id)
    except EdgeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{edge_id}", response_model=Edge)
def update_edge(
    edge_id: str, data: EdgeUpdate, store: GraphStore = Depends(get_store)
) -> Edge:
    try:
        return store.update_edge(edge_id, data)
    except EdgeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{edge_id}", status_code=204)
def delete_edge(edge_id: str, store: GraphStore = Depends(get_store)) -> None:
    try:
        store.delete_edge(edge_id)
    except EdgeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
