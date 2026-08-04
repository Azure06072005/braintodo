import { useMemo, useState } from "react";
import TopBar from "./components/TopBar";
import GraphCanvas from "./components/GraphCanvas";
import NodeDetailPanel from "./components/NodeDetailPanel";
import Modal from "./components/Modal";
import NodeForm from "./components/NodeForm";
import EdgeForm from "./components/EdgeForm";
import SearchBar from "./components/SearchBar";
import { useGraphData } from "./hooks/useGraphData";
import { theme } from "./theme";

export default function App() {
  const [source, setSource] = useState("mock");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [modal, setModal] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);

  const {
    nodes, edges, clusters, linkSuggestions, loading, error, realtimeStatus,
    createNode, updateNode, deleteNode, createEdge, search,
  } = useGraphData(source);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) : null;

  const highlightNodeIds = useMemo(
    () => (searchResult ? new Set(searchResult.subgraph_nodes.map((n) => n.id)) : null),
    [searchResult]
  );
  const matchNodeIds = useMemo(
    () => (searchResult ? new Set(searchResult.matches.map((m) => m.node_id)) : null),
    [searchResult]
  );

  async function handleDeleteNode(node) {
    if (!window.confirm(`Xoá "${node.title}"? Mọi liên kết tới node này cũng sẽ mất.`)) return;
    await deleteNode(node.id);
    if (selectedNodeId === node.id) setSelectedNodeId(null);
  }

  async function handleSearch(query) {
    setSearching(true);
    try {
      const result = await search(query, { limit: 10, depth: 1 });
      setSearchResult(result);
    } catch (err) {
      window.alert(`Tìm kiếm thất bại: ${err.message}`);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectMatch(nodeId) {
    setSelectedNodeId(nodeId);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar
        source={source}
        onSourceChange={setSource}
        loading={loading}
        error={error}
        realtimeStatus={realtimeStatus}
        onNewNode={() => setModal({ type: "create-node" })}
        onNewEdge={() => setModal({ type: "create-edge" })}
      />

      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.panelBorder}` }}>
        <SearchBar
          onSearch={handleSearch}
          onClear={() => setSearchResult(null)}
          onSelectMatch={handleSelectMatch}
          result={searchResult}
          searching={searching}
        />
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
            highlightNodeIds={highlightNodeIds}
            matchNodeIds={matchNodeIds}
          />
        </div>

        <NodeDetailPanel
          node={selectedNode}
          clusters={clusters}
          linkSuggestions={linkSuggestions}
          allNodesById={nodesById}
          onEdit={(node) => setModal({ type: "edit-node", node })}
          onDelete={handleDeleteNode}
        />
      </div>

      {modal?.type === "create-node" && (
        <Modal title="Tạo ý tưởng mới" onClose={() => setModal(null)}>
          <NodeForm mode="create" onSubmit={async (data) => {
            const node = await createNode(data);
            setModal(null);
            setSelectedNodeId(node.id);
          }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === "edit-node" && (
        <Modal title="Sửa ý tưởng" onClose={() => setModal(null)}>
          <NodeForm mode="edit" initial={modal.node} onSubmit={async (data) => {
            await updateNode(modal.node.id, data);
            setModal(null);
          }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === "create-edge" && (
        <Modal title="Tạo liên kết mới" onClose={() => setModal(null)}>
          <EdgeForm nodes={nodes} defaultSourceId={selectedNodeId} onSubmit={async (data) => {
            await createEdge(data);
            setModal(null);
          }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      <style>{`body { margin: 0; background: ${theme.canvasBg}; }`}</style>
    </div>
  );
}