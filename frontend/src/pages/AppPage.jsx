import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import GraphCanvas from "../components/GraphCanvas";
import NodeDetailPanel from "../components/NodeDetailPanel";
import Modal from "../components/Modal";
import NodeForm from "../components/NodeForm";
import EdgeForm from "../components/EdgeForm";
import SearchBar from "../components/SearchBar";
import ImportExportControls from "../components/ImportExportControls";
import { useGraphData } from "../hooks/useGraphData";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { theme } from "../theme";
import { IS_DEV } from "../config/env";

// Lazy-loaded: three.js is a heavy dependency (~500kB minified) that most
// users won't need if they never switch to the 3D view. Splitting it into
// its own chunk keeps the main bundle small for the common case (2D-only
// usage) and only downloads three.js the first time someone clicks "3D".
const GraphCanvas3D = lazy(() => import("../components/GraphCanvas3D"));

export default function AppPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  // FE026: the authenticated app defaults to live data in production - the
  // mock demo now has its own dedicated home on the public marketing pages
  // (FE024's Example section). "mock" stays the default in dev builds
  // (IS_DEV) purely so local development/testing doesn't require a live
  // backend running - see TopBar.jsx for the matching toggle visibility.
  const [source, setSource] = useState(IS_DEV ? "mock" : "live");
  const [viewMode, setViewMode] = useState("2d"); // "2d" | "3d" (FE025)
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
    exportGraph,
    importGraph,
  } = useGraphData(source, undefined, token);

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
        window.alert(t("topology.compute_failed", { error: err.message }));
        setTopologyEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setTopologyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topologyEnabled, nodes, edges, getTopology, t]);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", position: "relative", zIndex: 1, overflow: "hidden" }}>
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        extraActions={<ImportExportControls onExport={exportGraph} onImport={importGraph} />}
      />

      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.panelBorder}`, background: "rgba(13, 16, 32, 0.4)", backdropFilter: "blur(6px)" }}>
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
          {viewMode === "3d" ? (
            <Suspense
              fallback={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: theme.textMuted,
                    fontSize: 13,
                  }}
                >
                  {t("common.loading")}
                </div>
              }
            >
              <GraphCanvas3D
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClickOnCanvas}
                selectedNodeId={selectedNodeId}
                clusters={clusterOverlayEnabled ? clusters : null}
              />
            </Suspense>
          ) : (
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
          )}
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