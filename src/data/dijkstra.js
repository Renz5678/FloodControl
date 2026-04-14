/**
 * Dijkstra's Algorithm
 * Edge weight = time + (100 * floodRisk)
 *
 * The high flood penalty (100 min per risk level) ensures the algorithm
 * strongly avoids flooded roads and picks flood-free paths whenever possible.
 *
 * Returns: { path: [nodeId], totalTime, maxRisk, found: bool }
 */
import { adjacency } from './graph'

const FLOOD_PENALTY = 100 // 100 min penalty per flood risk level — strongly avoids flooded roads

export function dijkstra(originId, destinationId) {
  // Distance map: nodeId → { cost, time, maxRisk }
  const dist = {};
  const prev = {};
  const visited = new Set();

  // Initialize all nodes
  for (const nodeId of Object.keys(adjacency)) {
    dist[nodeId] = { cost: Infinity, time: Infinity, maxRisk: 0 };
    prev[nodeId] = null;
  }

  dist[originId] = { cost: 0, time: 0, maxRisk: 0 };

  // Simple priority queue (sorted array for this small graph)
  const queue = [{ id: originId, cost: 0 }];

  while (queue.length > 0) {
    // Pick node with smallest cost
    queue.sort((a, b) => a.cost - b.cost);
    const { id: current } = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === destinationId) break;

    const neighbors = adjacency[current] || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const edgeWeight = edge.time + FLOOD_PENALTY * edge.floodRisk
      const newCost = dist[current].cost + edgeWeight;
      const newTime = dist[current].time + edge.time;
      const newRisk = Math.max(dist[current].maxRisk, edge.floodRisk);

      if (newCost < dist[edge.to].cost) {
        dist[edge.to] = { cost: newCost, time: newTime, maxRisk: newRisk };
        prev[edge.to] = current;
        queue.push({ id: edge.to, cost: newCost });
      }
    }
  }

  // Reconstruct path
  if (dist[destinationId].cost === Infinity) {
    return { path: [], totalTime: 0, maxRisk: 0, found: false };
  }

  const path = [];
  let cursor = destinationId;
  while (cursor !== null) {
    path.unshift(cursor);
    cursor = prev[cursor];
  }

  return {
    path,
    totalTime: dist[destinationId].time,
    maxRisk: dist[destinationId].maxRisk,
    found: true,
  };
}
