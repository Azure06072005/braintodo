import { seededRandom } from "../theme";

/**
 * Simple 3D force-directed layout: pairwise repulsion between all nodes,
 * spring attraction along edges, and a gentle centering force so the whole
 * graph doesn't drift away from the origin. O(n^2) per iteration (all-pairs
 * repulsion) - fine for the graph sizes this app deals with; a real
 * Barnes-Hut approximation would only start to matter in the
 * thousands-of-nodes range.
 *
 * Deliberately synchronous and "settle then render" rather than a
 * continuously-running physics simulation: computed once via useMemo when
 * nodes/edges change (see GraphCanvas3D.jsx), not re-run every animation
 * frame. This keeps the render loop doing only rendering (camera, draw
 * calls), not physics, and keeps this module trivially unit-testable
 * without touching WebGL/three.js at all.
 *
 * Uses the existing seededRandom() (theme.js) for initial placement rather
 * than Math.random(), so layouts are deterministic across renders and
 * reloads - same graph always settles into the same shape, and this
 * module's own tests are reproducible.
 */

const ITERATIONS = 200;
const REPULSION = 400;
const SPRING_LENGTH = 6;
const SPRING_STRENGTH = 0.06;
const CENTERING_STRENGTH = 0.01;
const DAMPING = 0.85;
const MIN_DISTANCE = 0.5;

/**
 * @param {{id: string}[]} nodes
 * @param {{source_id: string, target_id: string}[]} edges
 * @returns {Map<string, {x: number, y: number, z: number}>}
 */
export function computeLayout(nodes, edges) {
  const positions = new Map();
  if (nodes.length === 0) return positions;

  const velocities = new Map();
  let seed = 1;
  for (const n of nodes) {
    seed += 1;
    positions.set(n.id, {
      x: (seededRandom(seed * 3.11) - 0.5) * 10,
      y: (seededRandom(seed * 5.73) - 0.5) * 10,
      z: (seededRandom(seed * 7.29) - 0.5) * 10,
    });
    velocities.set(n.id, { x: 0, y: 0, z: 0 });
  }

  if (nodes.length === 1) return positions;

  const validEdges = edges.filter(
    (e) => positions.has(e.source_id) && positions.has(e.target_id)
  );

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const forces = new Map(nodes.map((n) => [n.id, { x: 0, y: 0, z: 0 }]));

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const idA = nodes[i].id;
        const idB = nodes[j].id;
        const pa = positions.get(idA);
        const pb = positions.get(idB);
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dz = pa.z - pb.z;
        const distSq = Math.max(dx * dx + dy * dy + dz * dz, MIN_DISTANCE * MIN_DISTANCE);
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        const fa = forces.get(idA);
        const fb = forces.get(idB);
        fa.x += fx;
        fa.y += fy;
        fa.z += fz;
        fb.x -= fx;
        fb.y -= fy;
        fb.z -= fz;
      }
    }

    for (const e of validEdges) {
      const pa = positions.get(e.source_id);
      const pb = positions.get(e.target_id);
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dz = pb.z - pa.z;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), MIN_DISTANCE);
      const displacement = dist - SPRING_LENGTH;
      const force = displacement * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      const fa = forces.get(e.source_id);
      const fb = forces.get(e.target_id);
      fa.x += fx;
      fa.y += fy;
      fa.z += fz;
      fb.x -= fx;
      fb.y -= fy;
      fb.z -= fz;
    }

    for (const n of nodes) {
      const p = positions.get(n.id);
      const f = forces.get(n.id);
      f.x -= p.x * CENTERING_STRENGTH;
      f.y -= p.y * CENTERING_STRENGTH;
      f.z -= p.z * CENTERING_STRENGTH;
    }

    for (const n of nodes) {
      const v = velocities.get(n.id);
      const f = forces.get(n.id);
      const p = positions.get(n.id);
      v.x = (v.x + f.x) * DAMPING;
      v.y = (v.y + f.y) * DAMPING;
      v.z = (v.z + f.z) * DAMPING;
      p.x += v.x;
      p.y += v.y;
      p.z += v.z;
    }
  }

  return positions;
}