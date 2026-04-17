import { useState } from 'react'
import { nodes } from '../data/graph'
import { getRiskLevel } from '../data/graph'
import { dijkstra, compareRoutes, PRESETS } from '../data/dijkstra'

// All selectable nodes, sorted alphabetically by label
const allNodes = Object.values(nodes).sort((a, b) => a.label.localeCompare(b.label))

export default function RoutePanel({ onRoute }) {
  const [origin, setOrigin]           = useState(allNodes[0].id)
  const [destination, setDestination] = useState(allNodes.find(n => n.id === 'pup')?.id ?? allNodes[1].id)
  const [preset, setPreset]           = useState('BALANCED')
  const [result, setResult]           = useState(null)
  const [comparison, setComparison]   = useState(null)
  const [showComparison, setShowComparison] = useState(false)
  const [loading, setLoading]         = useState(false)

  const { alpha, beta } = PRESETS[preset]

  function handleFindRoute() {
    if (origin === destination) return
    setLoading(true)
    setResult(null)
    setComparison(null)
    setShowComparison(false)

    setTimeout(() => {
      const res  = dijkstra(origin, destination, alpha, beta)
      const comp = compareRoutes(origin, destination, alpha, beta)
      setResult(res)
      setComparison(comp)
      onRoute(res.found ? res.path : [], res.totalRisk)
      setLoading(false)
    }, 80)
  }

  const riskMeta    = result ? getRiskLevel(result.totalRisk) : null
  const originNode  = nodes[origin]
  const destNode    = nodes[destination]
  const sameNode    = origin === destination

  // Destination options exclude the selected origin; origin options exclude selected destination
  const originOptions = allNodes.filter(n => n.id !== destination)
  const destOptions   = allNodes.filter(n => n.id !== origin)

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      width: '310px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
      paddingRight: '2px',
    }}>

      {/* ── Header card ───────────────────────────────────────────── */}
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
              Risk-Aware Navigator · W = α·t + β·r
            </div>
          </div>
        </div>

        {/* Origin */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block',
                          marginBottom: '6px' }}>
            From
          </label>
          <select
            className="select-custom"
            value={origin}
            onChange={e => {
              setOrigin(e.target.value)
              setResult(null)
              setComparison(null)
              onRoute([], 0)
            }}
          >
            {originOptions.map(n => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </div>

        {/* Swap button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <button
            onClick={() => {
              const tmp = origin
              setOrigin(destination)
              setDestination(tmp)
              setResult(null)
              setComparison(null)
              onRoute([], 0)
            }}
            title="Swap origin and destination"
            style={{
              padding: '4px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'var(--color-surface2)',
              color: 'var(--color-muted)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            ⇅ Swap
          </button>
        </div>

        {/* Destination */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block',
                          marginBottom: '6px' }}>
            To
          </label>
          <select
            className="select-custom"
            value={destination}
            onChange={e => {
              setDestination(e.target.value)
              setResult(null)
              setComparison(null)
              onRoute([], 0)
            }}
          >
            {destOptions.map(n => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </div>

        {/* Same-node warning */}
        {sameNode && (
          <div style={{
            marginBottom: '10px', padding: '8px 12px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '8px', fontSize: '0.78rem', color: '#f87171',
          }}>
            ⚠️ Origin and destination must be different.
          </div>
        )}

        {/* ── Routing preset selector ─────────────────────────────── */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block',
                          marginBottom: '8px' }}>
            Routing Mode
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {Object.entries(PRESETS).map(([key, p]) => {
              const active = preset === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setPreset(key)
                    setResult(null)
                    setComparison(null)
                    onRoute([], 0)
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: active ? '1px solid rgba(59,130,246,0.7)' : '1px solid rgba(255,255,255,0.08)',
                    background: active
                      ? 'linear-gradient(135deg, rgba(29,78,216,0.4), rgba(59,130,246,0.25))'
                      : 'var(--color-surface2)',
                    color: active ? '#93c5fd' : 'var(--color-muted)',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                  <span>{p.label}</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.75 }}>α{p.alpha} β{p.beta}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Find Route button */}
        <button
          className="btn-primary"
          onClick={handleFindRoute}
          disabled={loading || sameNode}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite',
                             width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                             borderTop: '2px solid white', borderRadius: '50%' }} />
              Calculating…
            </>
          ) : (
            <><span>🔍</span> Find Route</>
          )}
        </button>
      </div>

      {/* ── Result card ───────────────────────────────────────────── */}
      {result && (
        <div className="panel animate-fade-in" style={{ padding: '16px 18px' }}>
          {result.found ? (
            <>
              {/* Risk status banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: `${riskMeta.color}18`,
                border: `1px solid ${riskMeta.color}55`,
                borderRadius: '10px', padding: '10px 12px',
                marginBottom: '14px',
              }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {riskMeta.label === 'None' ? '🛡️'
                    : riskMeta.label === 'Low' ? '✅'
                    : riskMeta.label === 'Moderate' ? '⚠️'
                    : '🚨'}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: riskMeta.color }}>
                    {riskMeta.label === 'None' ? 'Flood-Free Route'
                      : riskMeta.label === 'Low' ? 'Minimal Flood Exposure'
                      : riskMeta.label === 'Moderate' ? 'Moderate Flood Risk'
                      : 'High Flood Risk'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '1px' }}>
                    Mode: <strong style={{ color: 'var(--color-text)' }}>{PRESETS[preset].label}</strong>
                    &nbsp;·&nbsp;α={alpha} β={beta}
                  </div>
                </div>
              </div>

              {/* 4-stat grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <StatBox icon="⏱️" label="Travel Time"    value={`${result.totalTime} min`}                       color="#3b82f6" />
                <StatBox icon="💧" label="Risk Score"     value={result.totalRisk.toFixed(2)}                     color={riskMeta.color} />
                <StatBox icon="🌊" label="Flood Exposure" value={`${Math.round(result.floodExposureRatio * 100)}%`} color="#f97316" />
                <StatBox icon="🏷️" label="Risk Level"    value={riskMeta.label}                                  color={riskMeta.color} />
              </div>

              {/* Path display */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Route Path
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {result.path.map((id, i) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: i === 0 ? '#3b82f6'
                          : i === result.path.length - 1 ? '#22c55e'
                          : '#64748b',
                      }} />
                      <span style={{
                        fontSize: '0.82rem',
                        color: i === 0 || i === result.path.length - 1 ? 'var(--color-text)' : 'var(--color-muted)',
                        fontWeight: i === 0 || i === result.path.length - 1 ? 500 : 400,
                      }}>
                        {nodes[id].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compare toggle */}
              {comparison && (
                <button
                  onClick={() => setShowComparison(v => !v)}
                  style={{
                    width: '100%', padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: showComparison ? 'rgba(59,130,246,0.15)' : 'var(--color-surface2)',
                    color: 'var(--color-muted)', fontFamily: 'Inter, sans-serif',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>📊</span>
                  {showComparison ? 'Hide Comparison' : 'Compare with Fastest Route'}
                </button>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⛔</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>No Route Found</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                No path exists from {originNode.label} to {destNode.label}.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Comparison panel ──────────────────────────────────────── */}
      {showComparison && comparison && comparison.fastest.found && comparison.riskAware.found && (
        <div className="panel animate-fade-in" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Route Comparison
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <DeltaBox
              label="Time Cost"
              value={comparison.timeDiff >= 0 ? `+${comparison.timeDiff} min` : `${comparison.timeDiff} min`}
              sub="vs fastest route"
              positive={comparison.timeDiff <= 0}
              positiveLabel="Faster!"
              negativeLabel="Slower"
              icon="⏱️"
            />
            <DeltaBox
              label="Risk Saved"
              value={comparison.riskReduction >= 0
                ? `−${comparison.riskReduction.toFixed(2)}`
                : `+${Math.abs(comparison.riskReduction).toFixed(2)}`}
              sub="risk score reduction"
              positive={comparison.riskReduction >= 0}
              positiveLabel="Safer"
              negativeLabel="Riskier"
              icon="💧"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <MiniRoute label="⚡ Fastest"    route={comparison.fastest}   color="#f97316" />
            <MiniRoute label={`${PRESETS[preset].icon} ${PRESETS[preset].label}`}
                       route={comparison.riskAware} color="#3b82f6" />
          </div>
        </div>
      )}

      {/* ── Legend card ───────────────────────────────────────────── */}
      <div className="panel animate-fade-in" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Legend
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <LegendItem color="#22c55e" label="Safe route (low risk)"            type="line" />
          <LegendItem color="#f97316" label="Risky route (moderate/high risk)" type="line" />
          <LegendItem color="#f97316" label="Flood zone (5-yr return period)"  type="fill" />
          <LegendItem color="#3b82f6" label="Starting point"                   type="dot" />
          <LegendItem color="#22c55e" label="Destination"                      type="dot" />
        </div>
        <div style={{
          marginTop: '10px', padding: '8px 10px',
          background: 'var(--color-surface2)', borderRadius: '8px',
          fontSize: '0.72rem', color: 'var(--color-muted)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <strong style={{ color: 'var(--color-text)' }}>W</strong> = α·time + β·(flood_level × ratio)
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--color-surface2)', borderRadius: '10px',
      padding: '10px 12px', border: `1px solid ${color}33`,
    }}>
      <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color }}>{value}</div>
    </div>
  )
}

function DeltaBox({ icon, label, value, sub, positive, positiveLabel, negativeLabel }) {
  const color = positive ? '#22c55e' : '#f97316'
  return (
    <div style={{
      background: 'var(--color-surface2)', borderRadius: '10px',
      padding: '10px 12px', border: `1px solid ${color}33`,
    }}>
      <div style={{ fontSize: '1rem', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: '1rem', color, marginTop: '2px' }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '2px' }}>{sub}</div>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, color, marginTop: '4px' }}>
        {positive ? positiveLabel : negativeLabel}
      </div>
    </div>
  )
}

function MiniRoute({ label, route, color }) {
  return (
    <div style={{
      background: 'var(--color-surface2)', borderRadius: '10px',
      padding: '10px 12px', border: `1px solid ${color}33`,
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color, marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '2px' }}>⏱ {route.totalTime} min</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '2px' }}>💧 Risk: {route.totalRisk.toFixed(2)}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>🌊 Exposure: {Math.round(route.floodExposureRatio * 100)}%</div>
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
