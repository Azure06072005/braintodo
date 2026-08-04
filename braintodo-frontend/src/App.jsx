import { useEffect, useMemo, useState } from "react";
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
  const [topologyEnabled, setTopologyEnabled] = useState(false);
  const [topology, setTopology] = useState(null);
  const [topologyLoading, setTopologyLoading] = useState(false);
  const [clusterOverlayEnabled, setClusterOverlayEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false); // chỉ có ý nghĩa ở màn hình hẹp

  const {
    nodes,
    edges,
    clusters,
    linkSuggestions,
    loading,
    error,
    realtimeStatus,
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    search,
    getTopology,
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
    if (!window.confirm(`Xoá "${node.title}"? Mọi liên kết tới node này cũng sẽ mất.`)) {
      return;
    }
    await deleteNode(node.id);
    if (selectedNodeId === node.id) setSelectedNodeId(null);
  }

  useEffect(() => {
    if (!topologyEnabled) {
      setTopology(null);
      return;
    }
    let cancelled = false;
    setTopologyLoading(true);
    getTopology()
      .then((list) => {
        if (cancelled) return;
        setTopology(new Map(list.map((t) => [t.node_id, t])));
      })
      .catch((err) => {
        if (cancelled) return;
        window.alert(`Không tính được topology: ${err.message}`);
        setTopologyEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setTopologyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topologyEnabled, nodes, edges, getTopology]);

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
    setPanelOpen(true); // trên mobile, chọn kết quả tìm kiếm cũng nên mở drawer chi tiết
  }

  function handleNodeClickOnCanvas(nodeId) {
    setSelectedNodeId(nodeId);
    setPanelOpen(true);
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
        topologyEnabled={topologyEnabled}
        onToggleTopology={() => setTopologyEnabled((v) => !v)}
        topologyLoading={topologyLoading}
        clusterOverlayEnabled={clusterOverlayEnabled}
        onToggleClusterOverlay={() => setClusterOverlayEnabled((v) => !v)}
        onTogglePanel={() => setPanelOpen((v) => !v)}
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
            onNodeClick={handleNodeClickOnCanvas}
            selectedNodeId={selectedNodeId}
            highlightNodeIds={highlightNodeIds}
            matchNodeIds={matchNodeIds}
            topology={topology}
            clusters={clusterOverlayEnabled ? clusters : null}
          />
        </div>

        <NodeDetailPanel
          node={selectedNode}
          clusters={clusters}
          linkSuggestions={linkSuggestions}
          allNodesById={nodesById}
          onEdit={(node) => setModal({ type: "edit-node", node })}
          onDelete={handleDeleteNode}
          topology={topology}
          panelOpen={panelOpen}
          onClosePanel={() => setPanelOpen(false)}
        />
      </div>

      {modal?.type === "create-node" && (
        <Modal title="Tạo ý tưởng mới" onClose={() => setModal(null)}>
          <NodeForm
            mode="create"
            onSubmit={async (data) => {
              const node = await createNode(data);
              setModal(null);
              setSelectedNodeId(node.id);
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === "edit-node" && (
        <Modal title="Sửa ý tưởng" onClose={() => setModal(null)}>
          <NodeForm
            mode="edit"
            initial={modal.node}
            onSubmit={async (data) => {
              await updateNode(modal.node.id, data);
              setModal(null);
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === "create-edge" && (
        <Modal title="Tạo liên kết mới" onClose={() => setModal(null)}>
          <EdgeForm
            nodes={nodes}
            defaultSourceId={selectedNodeId}
            onSubmit={async (data) => {
              await createEdge(data);
              setModal(null);
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}