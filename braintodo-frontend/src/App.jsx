import { useMemo, useState } from "react";
import TopBar from "./components/TopBar";
import GraphCanvas from "./components/GraphCanvas";
import NodeDetailPanel from "./components/NodeDetailPanel";
import { useGraphData } from "./hooks/useGraphData";
import { theme } from "./theme";

export default function App() {
  const [source, setSource] = useState("mock");
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const { nodes, edges, clusters, linkSuggestions, loading, error, realtimeStatus } =
    useGraphData(source);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar
        source={source}
        onSourceChange={setSource}
        loading={loading}
        error={error}
        realtimeStatus={realtimeStatus}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>

        <NodeDetailPanel
          node={selectedNode}
          clusters={clusters}
          linkSuggestions={linkSuggestions}
          allNodesById={nodesById}
        />
      </div>

      <style>{`body { margin: 0; background: ${theme.canvasBg}; }`}</style>
    </div>
  );
}