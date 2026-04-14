import { useState } from 'react'
import MapView from './components/MapView'
import RoutePanel from './components/RoutePanel'

export default function App() {
  const [routePath, setRoutePath] = useState([])
  const [geoFloodRisk, setGeoFloodRisk] = useState(null)

  function handleRoute(path) {
    setRoutePath(path)
    // Reset geo-detected flood risk until MapView re-checks the new path
    setGeoFloodRisk(null)
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Full-screen map */}
      <MapView routePath={routePath} onFloodRisk={setGeoFloodRisk} />

      {/* Overlay panel */}
      <RoutePanel onRoute={handleRoute} geoFloodRisk={geoFloodRisk} />

      {/* Attribution bar */}
      <div style={{
        position: 'absolute', bottom: 8, right: 12,
        fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)',
        zIndex: 1000, pointerEvents: 'none',
        fontFamily: 'Inter, sans-serif',
      }}>
        DesAlgo Demo · Dijkstra’s Algorithm · Metro Manila
      </div>
    </div>
  )
}
