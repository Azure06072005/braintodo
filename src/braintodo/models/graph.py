from pydantic import BaseModel 

from braintodo.models.edge import Edge
from braintodo.models.node import Node

class GraphExport(BaseModel): 
    nodes: list[Node]
    edges: list[Edge]

class GraphImportResult(BaseModel): 
    nodes_created: int
    edges_created: int 
    edges_skipped: int 