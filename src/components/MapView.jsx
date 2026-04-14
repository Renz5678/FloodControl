import { useState, useEffect, useRef } from 'react'
import { nodes } from '../data/graph'

// Import Leaflet CSS (must be before MapContainer)
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in Vite/webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MANILA_CENTER = [14.6180, 121.0025]
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

// Custom divIcon for nodes
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


// ── Geometry helpers ─────────────────────────────────────────────────────

/**
 * Ray-casting point-in-polygon.
 * point = [lat, lng] (Leaflet order)
 * ring  = array of GeoJSON [lng, lat] pairs
 */
function pointInPolygon([lat, lng], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [rLng_i, rLat_i] = ring[i]
    const [rLng_j, rLat_j] = ring[j]
    const intersect =
      rLat_i > lat !== rLat_j > lat &&
      lng < ((rLng_j - rLng_i) * (lat - rLat_i)) / (rLat_j - rLat_i) + rLng_i
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Check whether any sampled route point lies inside a flood zone polygon.
 * Returns the detected max risk (0 = safe, 1 = moderate).
 * All flood features in this dataset are treated as moderate risk (1).
 */
function checkRouteFloodRisk(routePoints, geojson) {
  const features = geojson?.features ?? []
  // Sample every 4th point for performance
  const sampled = routePoints.filter((_, i) => i % 4 === 0)

  for (const point of sampled) {
    for (const feature of features) {
      const geom = feature.geometry
      if (!geom) continue

      // Normalise to [[ring,...], ...] regardless of Polygon vs MultiPolygon
      const ringsets =
        geom.type === 'Polygon'
          ? [geom.coordinates]
          : geom.type === 'MultiPolygon'
          ? geom.coordinates
          : []

      for (const rings of ringsets) {
        const outer = rings[0] // first ring = outer boundary
        if (pointInPolygon(point, outer)) return 1
      }
    }
  }
  return 0
}

export default function MapView({ routePath, onFloodRisk }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routeLayerRef = useRef(null)
  const nodeMarkersRef = useRef([])
  const floodLayerRef = useRef(null)
  const floodJsonRef = useRef(null)   // raw GeoJSON kept for intersection tests
  const fetchTokenRef = useRef(0)     // cancellation token

  // Init map once
  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: MANILA_CENTER,
      zoom: 13,
      zoomControl: false,
    })

    // Dark basemap tile layer (CartoDB dark matter)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map)

    // Custom zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstanceRef.current = map

    // Load flood overlay — also store raw GeoJSON for intersection tests
    fetch('/flood_data.json')
      .then(r => r.json())
      .then(geojson => {
        floodJsonRef.current = geojson          // ← keep for route checks
        floodLayerRef.current = L.geoJSON(geojson, {
          style: () => ({
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.28,
            weight: 1,
            dashArray: '4 3',
            opacity: 0.6,
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

    // Draw all nodes as small dots
    Object.values(nodes).forEach(node => {
      const isPup = node.id === 'pup'
      const marker = L.marker(node.coords, {
        icon: createNodeIcon(isPup ? '#22c55e' : '#64748b', isPup),
        title: node.label,
      })

      marker.bindTooltip(
        `<div style="background:#1a1d27;color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);
                    border-radius:6px;padding:5px 10px;font-family:Inter,sans-serif;font-size:0.8rem;">
          ${isPup ? '🏁 ' : ''}${node.label}
        </div>`,
        { opacity: 1, className: 'leaflet-tooltip-custom' }
      )

      marker.addTo(map)
      nodeMarkersRef.current.push({ id: node.id, marker })
    })

  }, [])

  // Update route line when routePath changes — fetch real road geometry from OSRM
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remove old route layer
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    // Reset all node markers to default
    nodeMarkersRef.current.forEach(({ id, marker }) => {
      const isPup = id === 'pup'
      marker.setIcon(createNodeIcon(isPup ? '#22c55e' : '#64748b', isPup))
    })

    if (!routePath || routePath.length < 2) return

    // Issue a new fetch token; stale fetches will be ignored
    const token = ++fetchTokenRef.current

    // Draw a temporary dashed straight-line placeholder while OSRM loads
    const placeholderCoords = routePath.map(id => nodes[id].coords)
    const placeholder = L.polyline(placeholderCoords, {
      color: '#22c55e',
      weight: 2,
      opacity: 0.4,
      dashArray: '6 8',
    }).addTo(map)
    routeLayerRef.current = placeholder
    map.fitBounds(L.latLngBounds(placeholderCoords), { padding: [60, 60] })

    /**
     * Single OSRM request with ALL waypoints in one shot.
     * This prevents the per-segment snapping that caused unnecessary left/right jogs.
     */
    async function fetchAndDraw() {
      try {
        // Build waypoint string: OSRM expects lng,lat order
        const waypointsStr = routePath
          .map(id => {
            const [lat, lng] = nodes[id].coords
            return `${lng},${lat}`
          })
          .join(';')

        const url = `${OSRM_BASE}/${waypointsStr}?overview=full&geometries=geojson`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`OSRM error: ${res.status}`)
        const data = await res.json()
        if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No OSRM route')

        // OSRM returns [lng, lat] — convert to Leaflet [lat, lng]
        const stitched = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])

        // Stale check — a newer routePath was set while we were fetching
        if (token !== fetchTokenRef.current) return

        // ── Flood intersection check against real GeoJSON geometry ────────
        if (floodJsonRef.current && onFloodRisk) {
          const detectedRisk = checkRouteFloodRisk(stitched, floodJsonRef.current)
          onFloodRisk(detectedRisk)
        }

        // Remove placeholder
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)

        // Draw road-following polyline with glow effect
        const glowLine = L.polyline(stitched, {
          color: '#22c55e',
          weight: 12,
          opacity: 0.12,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)

        const mainLine = L.polyline(stitched, {
          color: '#22c55e',
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)

        const dashLine = L.polyline(stitched, {
          color: '#86efac',
          weight: 2,
          opacity: 0.55,
          dashArray: '10 14',
          lineCap: 'round',
        }).addTo(map)

        routeLayerRef.current = L.layerGroup([glowLine, mainLine, dashLine]).addTo(map)

        // Highlight nodes on route
        routePath.forEach((id, i) => {
          const entry = nodeMarkersRef.current.find(m => m.id === id)
          if (!entry) return
          const isOrigin = i === 0
          const isDest = i === routePath.length - 1
          const color = isOrigin ? '#3b82f6' : isDest ? '#22c55e' : '#86efac'
          entry.marker.setIcon(createNodeIcon(color, isOrigin || isDest))
        })

        // Fit map to real road bounds
        map.fitBounds(L.latLngBounds(stitched), { padding: [60, 60] })

      } catch (err) {
        console.warn('OSRM fetch failed, keeping straight-line fallback:', err)
        // Fallback: upgrade the placeholder to a solid line
        if (token !== fetchTokenRef.current) return
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)
        const fallback = L.polyline(placeholderCoords, {
          color: '#22c55e', weight: 4, opacity: 0.9, lineCap: 'round',
        }).addTo(map)
        routeLayerRef.current = fallback
      }
    }

    fetchAndDraw()
  }, [routePath])

  return (
    <div
      ref={mapRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
