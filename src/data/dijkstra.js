/**
 * Risk-Aware Dijkstra's Algorithm
 *
 * Weight function:  W(edge) = alpha * time + beta * risk
 * Where:           risk = flood_level * intersection_ratio
 *
 * alpha = importance of speed  (0.0 – 1.0)
 * beta  = importance of safety (0.0 – 1.0)
 *
 * Preset examples:
 *   FASTEST:  alpha = 1.0, beta = 0.0
 *   BALANCED: alpha = 0.7, beta = 0.3
 *   SAFEST:   alpha = 0.4, beta = 0.6
 *
 * Returns: {
 *   path              : [nodeId, …],
 *   totalTime         : number (minutes),
 *   totalRisk         : number (sum of edge risk scores along path),
 *   floodExposureRatio: number (0–1, fraction of travel time on risky edges),
 *   found             : boolean,
 * }
 */
import { adjacency, computeRisk } from './graph'

// ── Preset α/β configurations ────────────────────────────────────────────────
export const PRESETS = {
  FASTEST:  { alpha: 1.0, beta: 0.0, label: 'Fastest',  icon: '⚡' },
  BALANCED: { alpha: 0.7, beta: 0.3, label: 'Balanced', icon: '⚖️' },
  SAFEST:   { alpha: 0.4, beta: 0.6, label: 'Safest',   icon: '🛡️' },
}

/**
 * Risk scale factor — bridges the gap between risk scores (0–2.0) and
 * travel times (4–14 min). Without scaling, beta*risk is at most ~1.2,
 * which is almost never enough to change path selection vs a 2-min detour.
 *
 * With RISK_SCALE = 15:
 *   - A max-risk edge (flood_level=2, ratio=1.0) adds up to 0.6×2.0×15 = 18 min
 *     equivalent penalty in SAFEST mode — large enough to reroute around it.
 *   - The España/Quezon corridor (risk ~1.65 total) adds 0.3×1.65×15 ≈ 7.4 min
 *     penalty in BALANCED — enough to prefer the +5 min Avenida bypass.
 *   - totalRisk (displayed to user) remains unscaled to preserve true risk meaning.
 */
const RISK_SCALE = 15

// ── Core algorithm ────────────────────────────────────────────────────────────
export function dijkstra(originId, destinationId, alpha = 0.7, beta = 0.3) {
  // dist[nodeId] = { cost, time, risk, riskyTime }
  const dist = {}
  const prev = {}
  const visited = new Set()

  for (const nodeId of Object.keys(adjacency)) {
    dist[nodeId] = { cost: Infinity, time: 0, risk: 0, riskyTime: 0 }
    prev[nodeId] = null
  }

  dist[originId] = { cost: 0, time: 0, risk: 0, riskyTime: 0 }

  // Simple min-heap (sorted array — fine for this graph size)
  const queue = [{ id: originId, cost: 0 }]

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost)
    const { id: current } = queue.shift()

    if (visited.has(current)) continue
    visited.add(current)

    if (current === destinationId) break

    const neighbors = adjacency[current] || []
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue

      const edgeRisk   = computeRisk(edge)                           // flood_level × ratio (unscaled)
      const edgeWeight = alpha * edge.time + beta * edgeRisk * RISK_SCALE  // scaled for meaningful penalty

      const newCost      = dist[current].cost      + edgeWeight
      const newTime      = dist[current].time      + edge.time
      const newRisk      = dist[current].risk      + edgeRisk
      const newRiskyTime = dist[current].riskyTime + (edgeRisk > 0 ? edge.time : 0)

      if (newCost < dist[edge.to].cost) {
        dist[edge.to] = {
          cost:      newCost,
          time:      newTime,
          risk:      newRisk,
          riskyTime: newRiskyTime,
        }
        prev[edge.to] = current
        queue.push({ id: edge.to, cost: newCost })
      }
    }
  }

  // ── No path found ────────────────────────────────────────────────────
  if (dist[destinationId].cost === Infinity) {
    return { path: [], totalTime: 0, totalRisk: 0, floodExposureRatio: 0, found: false }
  }

  // ── Reconstruct path ─────────────────────────────────────────────────
  const path = []
  let cursor = destinationId
  while (cursor !== null) {
    path.unshift(cursor)
    cursor = prev[cursor]
  }

  const { time, risk, riskyTime } = dist[destinationId]
  const floodExposureRatio = time > 0 ? riskyTime / time : 0

  return {
    path,
    totalTime:          Math.round(time * 10) / 10,
    totalRisk:          Math.round(risk * 100) / 100,
    floodExposureRatio: Math.round(floodExposureRatio * 100) / 100,
    found: true,
  }
}

// ── Comparison mode ───────────────────────────────────────────────────────────
/**
 * Computes two routes and returns a comparison:
 *   routeA = FASTEST  (alpha=1.0, beta=0.0) — pure time
 *   routeB = the user's chosen preset
 *
 * Returns {
 *   fastest     : dijkstra result (routeA),
 *   riskAware   : dijkstra result (routeB),
 *   timeDiff    : routeB.totalTime - routeA.totalTime  (positive = routeB is slower)
 *   riskReduction: routeA.totalRisk - routeB.totalRisk (positive = routeB is safer)
 * }
 */
export function compareRoutes(originId, destinationId, alpha, beta) {
  const fastest   = dijkstra(originId, destinationId, 1.0, 0.0)
  const riskAware = dijkstra(originId, destinationId, alpha, beta)

  return {
    fastest,
    riskAware,
    timeDiff:      Math.round((riskAware.totalTime - fastest.totalTime) * 10) / 10,
    riskReduction: Math.round((fastest.totalRisk  - riskAware.totalRisk) * 100) / 100,
  }
}
