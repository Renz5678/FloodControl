import { useState } from 'react'
import { nodes, FLOOD_RISK_LABELS } from '../data/graph'
import { dijkstra } from '../data/dijkstra'

const DESTINATION_ID = 'pup'

// All nodes except PUP Gate are valid origins, sorted alphabetically
const origins = Object.values(nodes)
  .filter(n => n.id !== DESTINATION_ID)
  .sort((a, b) => a.label.localeCompare(b.label))

export default function RoutePanel({ onRoute, geoFloodRisk }) {
  const [origin, setOrigin] = useState(origins[0].id)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleFindRoute() {
    setLoading(true)
    setResult(null)

    // Small delay to let UI update before algorithm runs
    setTimeout(() => {
      const res = dijkstra(origin, DESTINATION_ID)
      setResult(res)
      onRoute(res.found ? res.path : [])
      setLoading(false)
    }, 80)
  }

  // Use the HIGHER of Dijkstra's graph-edge risk and the geometry-detected risk.
  // geoFloodRisk is null while OSRM is still loading (show graph risk in the meantime).
  const displayRisk = result
    ? Math.max(result.maxRisk, geoFloodRisk ?? result.maxRisk)
    : 0
  const riskMeta = result ? FLOOD_RISK_LABELS[displayRisk] : null
  const originNode = nodes[origin]

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      width: '300px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>

      {/* Header card */}
      <div className="panel animate-fade-in" style={{ padding: '18px 20px' }}>
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          }}>🗺️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              SafeRoute
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '1px' }}>
              Flood-Aware Navigator
            </div>
          </div>
        </div>

        {/* Origin (user-selectable) */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block',
                          marginBottom: '6px' }}>
            Your Starting Point
          </label>
          <select
            className="select-custom"
            value={origin}
            onChange={e => { setOrigin(e.target.value); setResult(null); onRoute([]) }}
          >
            {origins.map(n => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </div>

        {/* Destination (always PUP Gate) */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block',
                          marginBottom: '6px' }}>
            Destination
          </label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--color-surface2)',
            border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: '10px', padding: '9px 14px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                          boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)' }}>
              PUP Gate
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--color-muted)',
                            background: 'rgba(34,197,94,0.1)', padding: '2px 7px', borderRadius: '6px',
                            border: '1px solid rgba(34,197,94,0.2)' }}>
              Fixed
            </span>
          </div>
        </div>

        {/* Find Route button */}
        <button
          className="btn-primary"
          onClick={handleFindRoute}
          disabled={loading}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite',
                             width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                             borderTop: '2px solid white', borderRadius: '50%' }} />
              Calculating…
            </>
          ) : (
            <>
              <span>🔍</span> Find Safe Route
            </>
          )}
        </button>
      </div>

      {/* Result info card */}
      {result && (
        <div className="panel animate-fade-in" style={{ padding: '16px 18px' }}>
          {result.found ? (
            <>
              {/* Flood-free / flood-warning banner */}
              {displayRisk === 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.35)',
                  borderRadius: '10px', padding: '10px 12px',
                  marginBottom: '14px',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#22c55e' }}>
                      Flood-Free Route
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '1px' }}>
                      Avoids all flood-prone areas
                    </div>
                  </div>
                </div>
              ) : geoFloodRisk !== null && geoFloodRisk > result.maxRisk ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(249,115,22,0.1)',
                  border: '1px solid rgba(249,115,22,0.35)',
                  borderRadius: '10px', padding: '10px 12px',
                  marginBottom: '14px',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f97316' }}>
                      Flood Zone Detected on Road
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '1px' }}>
                      Route passes through a flood-affected area
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(249,115,22,0.1)',
                  border: '1px solid rgba(249,115,22,0.35)',
                  borderRadius: '10px', padding: '10px 12px',
                  marginBottom: '14px',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f97316' }}>
                      Flood Zone Traversed
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '1px' }}>
                      No fully safe path available
                    </div>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                            marginBottom: '14px' }}>
                <StatBox icon="⏱️" label="Travel Time" value={`${result.totalTime} min`} color="#3b82f6" />
                <StatBox icon="💧" label="Flood Risk" value={riskMeta.label} color={riskMeta.color} />
              </div>

              {/* Path display */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Route Path
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {result.path.map((id, i) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: i === 0 ? '#3b82f6' : i === result.path.length - 1 ? '#22c55e' : '#64748b',
                      }} />
                      <span style={{ fontSize: '0.82rem', color: i === 0 || i === result.path.length - 1
                        ? 'var(--color-text)' : 'var(--color-muted)', fontWeight: i === 0 || i === result.path.length - 1 ? 500 : 400 }}>
                        {nodes[id].label}
                      </span>
                      {i < result.path.length - 1 && (
                        <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.1)',
                                      marginLeft: 3, alignSelf: 'center' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⛔</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>No Route Found</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                No path exists from {originNode.label} to PUP Gate.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend card */}
      <div className="panel animate-fade-in" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Legend
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <LegendItem color="#22c55e" label="Optimal safe route" type="line" />
          <LegendItem color="#f97316" label="Flood zone (5-yr return period)" type="fill" />
          <LegendItem color="#3b82f6" label="Starting point" type="dot" />
          <LegendItem color="#22c55e" label="PUP Gate (Destination)" type="dot" />
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--color-surface2)',
      borderRadius: '10px',
      padding: '10px 12px',
      border: `1px solid ${color}33`,
    }}>
      <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: '1rem', color }}>
        {value}
      </div>
    </div>
  )
}

function LegendItem({ color, label, type }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {type === 'line' && (
        <div style={{ width: 24, height: 3, background: color, borderRadius: 2, flexShrink: 0,
                      boxShadow: `0 0 6px ${color}` }} />
      )}
      {type === 'fill' && (
        <div style={{ width: 16, height: 16, background: color + '55', border: `2px solid ${color}88`,
                      borderRadius: '4px', flexShrink: 0 }} />
      )}
      {type === 'dot' && (
        <div style={{ width: 12, height: 12, background: color, borderRadius: '50%', flexShrink: 0,
                      border: '2px solid white', boxShadow: `0 0 6px ${color}` }} />
      )}
      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{label}</span>
    </div>
  )
}
