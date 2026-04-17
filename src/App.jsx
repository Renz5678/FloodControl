import { useState } from 'react'
import MapView from './components/MapView'
import RoutePanel from './components/RoutePanel'

export default function App() {
  const [routePath, setRoutePath] = useState([])
  const [routeRisk, setRouteRisk] = useState(0)

  function handleRoute(path, totalRisk = 0) {
    setRoutePath(path)
    setRouteRisk(totalRisk)
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Full-screen map */}
      <MapView routePath={routePath} routeRisk={routeRisk} />

      {/* Overlay panel */}
      <RoutePanel onRoute={handleRoute} />

      {/* Attribution bar */}
      <div style={{
        position: 'absolute', bottom: 8, right: 12,
        fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)',
        zIndex: 1000, pointerEvents: 'none',
        fontFamily: 'Inter, sans-serif',
      }}>
        DesAlgo Demo · Dijkstra's Algorithm · W = α·time + β·risk
      </div>
    </div>
  )
}
