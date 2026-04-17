import { useEffect, useRef } from 'react'
import { nodes } from '../data/graph'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MANILA_CENTER = [14.6180, 121.0025]
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

function createNodeIcon(color = '#3b82f6', pulse = false) {
  const size = pulse ? 20 : 14
  const html = pulse
    ? `<div style="
        width:${size}px;height:${size}px;background:${color};
        border-radius:50%;border:3px solid white;
        box-shadow:0 0 0 0 ${color}88;
        animation:pulse-ring 2s ease-out infinite;
        position:relative;
      "></div>`
    : `<div style="
        width:${size}px;height:${size}px;background:${color};
        border-radius:50%;border:2px solid rgba(255,255,255,0.8);
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      "></div>`
  return L.divIcon({ html, className: '', iconAnchor: [size / 2, size / 2] })
}

// ── Risk → color mapping ──────────────────────────────────────────────────────
function riskToColor(risk) {
  if (risk >= 0.80) return '#ef4444'
  if (risk >= 0.30) return '#f97316'
  return '#22c55e'
}

export default function MapView({ routePath, routeRisk = 0 }) {
  const mapRef            = useRef(null)
  const mapInstanceRef    = useRef(null)
  const routeLayerRef     = useRef(null)   // OSRM road-following line
  const dijkstraLayerRef  = useRef(null)   // Dijkstra path overlay (node dots + connecting lines)
  const nodeMarkersRef    = useRef([])
  const floodLayerRef     = useRef(null)
  const fetchTokenRef     = useRef(0)

  // Init map once
  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: MANILA_CENTER,
      zoom: 13,
      zoomControl: false,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '&copy; <a href="https://carto.com/">CartoDB</a>', subdomains: 'abcd', maxZoom: 19 }
    ).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInstanceRef.current = map

    // Load flood overlay
    fetch('/flood_data.json')
      .then(r => r.json())
      .then(geojson => {
        floodLayerRef.current = L.geoJSON(geojson, {
          style: () => ({
            color: '#f97316', fillColor: '#f97316',
            fillOpacity: 0.28, weight: 1, dashArray: '4 3', opacity: 0.6,
          }),
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(
              `<div style="background:#1a1d27;color:#e2e8f0;border:1px solid #f97316;
                          border-radius:6px;padding:6px 10px;font-family:Inter,sans-serif;
                          font-size:0.8rem;font-weight:500;">
                ⚠️ Flood Zone<br/>
                <span style="color:#f97316">5-Year Return Period</span>
              </div>`,
              { sticky: true, opacity: 1, className: 'leaflet-tooltip-custom' }
            )
          },
        }).addTo(map)
      })
      .catch(console.error)

    // Draw all graph nodes as small grey dots
    Object.values(nodes).forEach(node => {
      const marker = L.marker(node.coords, {
        icon: createNodeIcon('#64748b', false),
        title: node.label,
      })
      marker.bindTooltip(
        `<div style="background:#1a1d27;color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);
                    border-radius:6px;padding:5px 10px;font-family:Inter,sans-serif;font-size:0.8rem;">
          ${node.label}
        </div>`,
        { opacity: 1, className: 'leaflet-tooltip-custom' }
      )
      marker.addTo(map)
      nodeMarkersRef.current.push({ id: node.id, marker })
    })

  }, [])

  // Update route when routePath changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remove old OSRM route layer
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    // Remove old Dijkstra overlay
    if (dijkstraLayerRef.current) {
      map.removeLayer(dijkstraLayerRef.current)
      dijkstraLayerRef.current = null
    }

    // Reset all node markers to default grey
    nodeMarkersRef.current.forEach(({ marker }) => {
      marker.setIcon(createNodeIcon('#64748b', false))
    })

    if (!routePath || routePath.length < 2) return

    const token = ++fetchTokenRef.current
    const lineColor = riskToColor(routeRisk)

    // ── Dijkstra path overlay ─────────────────────────────────────────────
    // Draw IMMEDIATELY (before OSRM loads) so the user can see which
    // corridor the algorithm chose. This is what makes presets look different.
    // ─────────────────────────────────────────────────────────────────────────
    const nodeCoords = routePath.map(id => nodes[id].coords)

    // Thin dashed white line connecting Dijkstra nodes
    const dijkstraLine = L.polyline(nodeCoords, {
      color: 'rgba(255,255,255,0.55)',
      weight: 2,
      dashArray: '6 9',
      lineCap: 'round',
    })

    // Small circles at every intermediate node (not origin/dest)
    const intermediateDots = routePath.slice(1, -1).map(id =>
      L.circleMarker(nodes[id].coords, {
        radius: 5,
        color: '#fff',
        fillColor: lineColor,
        fillOpacity: 0.85,
        weight: 2,
      })
    )

    dijkstraLayerRef.current = L.layerGroup([dijkstraLine, ...intermediateDots]).addTo(map)

    // Highlight origin + destination nodes
    routePath.forEach((id, i) => {
      const entry = nodeMarkersRef.current.find(m => m.id === id)
      if (!entry) return
      const isOrigin = i === 0
      const isDest   = i === routePath.length - 1
      if (isOrigin || isDest) {
        const color = isOrigin ? '#3b82f6' : '#22c55e'
        entry.marker.setIcon(createNodeIcon(color, true))
      }
    })

    // Fit map to the Dijkstra path bounds immediately
    map.fitBounds(L.latLngBounds(nodeCoords), { padding: [80, 80] })

    // ── OSRM road-following geometry ──────────────────────────────────────
    // Send the FULL Dijkstra waypoint list so the road line follows the
    // chosen corridor (e.g. Avenida bypass vs España). A proximity filter
    // drops nodes closer than MIN_DIST_DEG to the previous waypoint so OSRM
    // doesn't make tiny detours to nearly-coincident graph nodes (the former
    // cause of zigzags). Origin and destination are always kept.
    // ─────────────────────────────────────────────────────────────────────────
    async function fetchAndDraw() {
      try {
        const MIN_DIST_DEG = 0.004 // ≈ 400 m — minimum spacing between OSRM waypoints

        const filtered = routePath.filter((id, i) => {
          if (i === 0 || i === routePath.length - 1) return true   // always keep endpoints
          const [pLat, pLng] = nodes[routePath[i - 1]].coords
          const [cLat, cLng] = nodes[id].coords
          const d = Math.sqrt((cLat - pLat) ** 2 + (cLng - pLng) ** 2)
          return d >= MIN_DIST_DEG
        })

        const waypointsStr = filtered
          .map(id => { const [lat, lng] = nodes[id].coords; return `${lng},${lat}` })
          .join(';')

        const url = `${OSRM_BASE}/${waypointsStr}?overview=full&geometries=geojson`

        const res  = await fetch(url)
        if (!res.ok) throw new Error(`OSRM ${res.status}`)
        const data = await res.json()
        if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No OSRM route')

        const stitched = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])

        if (token !== fetchTokenRef.current) return

        // Replace any old OSRM layer
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)

        // Glow + main + dash lines, all in the risk-driven color
        const glowLine = L.polyline(stitched, {
          color: lineColor, weight: 14, opacity: 0.10,
          lineCap: 'round', lineJoin: 'round',
        }).addTo(map)

        const mainLine = L.polyline(stitched, {
          color: lineColor, weight: 4, opacity: 0.95,
          lineCap: 'round', lineJoin: 'round',
        }).addTo(map)

        const dashLine = L.polyline(stitched, {
          color: lineColor, weight: 2, opacity: 0.50,
          dashArray: '10 14', lineCap: 'round',
        }).addTo(map)

        routeLayerRef.current = L.layerGroup([glowLine, mainLine, dashLine]).addTo(map)

        // Re-fit to real road bounds
        map.fitBounds(L.latLngBounds(stitched), { padding: [60, 60] })

      } catch (err) {
        console.warn('OSRM fetch failed, keeping Dijkstra overlay as fallback:', err)
      }
    }

    fetchAndDraw()
  }, [routePath])

  return <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
}
