import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { theme } from "../theme";
import { computeLayout } from "../graph3d/computeLayout";

// Distance (in screen pixels) the pointer may move between down/up and
// still count as a "click" rather than an orbit-drag - standard technique
// to let OrbitControls' drag-to-rotate and click-to-select coexist on the
// same canvas without one interaction accidentally triggering the other.
const CLICK_DRAG_THRESHOLD_PX = 4;

/**
 * 3D counterpart to GraphCanvas.jsx (2D, d3-force/SVG). Renders nodes as
 * glowing spheres and edges as lines in a three.js scene, with orbit-style
 * camera controls (drag to rotate, scroll to zoom) matching the universe
 * theme. Node positions come from computeLayout() (graph3d/computeLayout.js),
 * a plain-JS force simulation computed once per nodes/edges change - the
 * render loop here only does camera/rendering work, no physics.
 *
 * Scope, deliberately limited for v1 (see Decisions.md): supports nodes,
 * edges, onNodeClick, selectedNodeId, and clusters (as per-node fill color
 * rather than drawn hull surfaces, which is a materially harder problem in
 * 3D than in 2D SVG). topology-based sizing and search
 * highlight/match-dimming (present in the 2D GraphCanvas) are not yet
 * implemented here - tracked as a known gap, not silently dropped.
 *
 * No backend change required: this consumes the exact same node/edge data
 * as the 2D view; 3D positions are computed entirely client-side and are
 * NOT persisted (see F023 for the optional future persistence extension).
 */
export default function GraphCanvas3D({ nodes, edges, onNodeClick, selectedNodeId, clusters }) {
  const containerRef = useRef(null);
  const stateRef = useRef(null);

  const clusterIdByNodeId = useMemo(() => {
    const map = new Map();
    if (clusters) {
      for (const c of clusters) {
        for (const nodeId of c.node_ids) {
          map.set(nodeId, c.cluster_id);
        }
      }
    }
    return map;
  }, [clusters]);

  const layout = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      // No WebGL context available (e.g. jsdom in tests, or a browser with
      // WebGL disabled) - render just the empty container rather than
      // crashing the page. Mirrors Starfield.jsx's null-2d-context handling.
      renderer = null;
    }

    if (!renderer) {
      return () => {
        container.removeChild(canvas);
      };
    }

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    camera.position.set(0, 0, 30);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
    const nodeMeshes = new Map();
    const disposableGeometries = [sphereGeometry];
    const disposableMaterials = [];

    for (const node of nodes) {
      const clusterId = clusterIdByNodeId.get(node.id);
      const color =
        clusterId != null
          ? theme.clusterPalette[clusterId % theme.clusterPalette.length]
          : node.color || theme.accent;
      const material = new THREE.MeshBasicMaterial({ color });
      disposableMaterials.push(material);
      const mesh = new THREE.Mesh(sphereGeometry, material);
      const radius = Math.max((node.size || 10) / 10, 0.5);
      mesh.scale.setScalar(radius);
      const pos = layout.get(node.id) || { x: 0, y: 0, z: 0 };
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData.nodeId = node.id;
      scene.add(mesh);
      nodeMeshes.set(node.id, mesh);
    }

    // A visibly larger wireframe sphere marks the selected node, added on
    // top rather than mutating the node's own material/scale.
    let selectionRing = null;
    function updateSelectionRing(nodeId) {
      if (selectionRing) {
        scene.remove(selectionRing);
        selectionRing.geometry.dispose();
        selectionRing.material.dispose();
        selectionRing = null;
      }
      const mesh = nodeId ? nodeMeshes.get(nodeId) : null;
      if (!mesh) return;
      const ringGeometry = new THREE.SphereGeometry(1.4, 16, 16);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: theme.importantRing,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      });
      selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
      selectionRing.position.copy(mesh.position);
      selectionRing.scale.copy(mesh.scale);
      scene.add(selectionRing);
    }
    updateSelectionRing(selectedNodeId);

    const edgePositions = [];
    for (const edge of edges) {
      const a = layout.get(edge.source_id);
      const b = layout.get(edge.target_id);
      if (!a || !b) continue;
      edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(edgePositions, 3)
    );
    disposableGeometries.push(edgeGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: theme.edge,
      transparent: true,
      opacity: 0.5,
    });
    disposableMaterials.push(edgeMaterial);
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    scene.add(edgeLines);

    function resize() {
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    resize();
    window.addEventListener("resize", resize);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = null;

    function setPointerFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function handlePointerDown(event) {
      pointerDownPos = { x: event.clientX, y: event.clientY };
    }

    function handlePointerUp(event) {
      if (!pointerDownPos || !onNodeClick) return;
      const dx = event.clientX - pointerDownPos.x;
      const dy = event.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > CLICK_DRAG_THRESHOLD_PX) return; // was a drag, not a click

      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...nodeMeshes.values()]);
      if (hits.length > 0) {
        onNodeClick(hits[0].object.userData.nodeId);
      }
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);

    let rafId = null;
    function animate() {
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    animate();

    stateRef.current = { updateSelectionRing };

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      for (const geo of disposableGeometries) geo.dispose();
      for (const mat of disposableMaterials) mat.dispose();
      if (selectionRing) {
        selectionRing.geometry.dispose();
        selectionRing.material.dispose();
      }
      renderer.dispose();
      container.removeChild(canvas);
    };
    // Re-created whenever the graph's shape or selection changes; layout and
    // clusterIdByNodeId are already memoized above so this doesn't recompute
    // physics on every render, only when nodes/edges genuinely change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, layout, clusterIdByNodeId, selectedNodeId, onNodeClick]);

  return (
    <div
      ref={containerRef}
      data-testid="graph-canvas-3d"
      style={{ width: "100%", height: "100%", position: "relative" }}
    />
  );
}