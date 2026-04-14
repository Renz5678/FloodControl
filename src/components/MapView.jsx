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

/**
 * Fetch road-following geometry from OSRM for a single edge.
 * Returns array of [lat, lng] pairs.
 */
async function fetchEdgeGeometry(fromCoords, toCoords) {
  const [fromLat, fromLng] = fromCoords
  const [toLat, toLng] = toCoords
  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`)
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No OSRM route')
  // OSRM returns [lng, lat] — convert to Leaflet [lat, lng]
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
}

export default function MapView({ routePath }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routeLayerRef = useRef(null)
  const nodeMarkersRef = useRef([])
  const floodLayerRef = useRef(null)
  const fetchTokenRef = useRef(0) // cancellation token

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

    // Load flood overlay
    fetch('/flood_data.json')
      .then(r => r.json())
      .then(geojson => {
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
      const isOrigin = node.id === 'pup'
      const marker = L.marker(node.coords, {
        icon: createNodeIcon(isOrigin ? '#3b82f6' : '#64748b', isOrigin),
        title: node.label,
      })

      marker.bindTooltip(
        `<div style="background:#1a1d27;color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);
                    border-radius:6px;padding:5px 10px;font-family:Inter,sans-serif;font-size:0.8rem;">
          ${isOrigin ? '📍 ' : ''}${node.label}
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
      marker.setIcon(createNodeIcon(id === 'pup' ? '#3b82f6' : '#64748b', id === 'pup'))
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

    // Fetch road geometry for every consecutive edge in the path
    async function fetchAndDraw() {
      try {
        const edgeFetches = []
        for (let i = 0; i < routePath.length - 1; i++) {
          edgeFetches.push(
            fetchEdgeGeometry(nodes[routePath[i]].coords, nodes[routePath[i + 1]].coords)
          )
        }

        // Run all edge fetches in parallel
        const segments = await Promise.all(edgeFetches)

        // Stale check — a newer routePath was set while we were fetching
        if (token !== fetchTokenRef.current) return

        // Stitch segments: drop the first point of each subsequent segment
        // to avoid duplicate waypoints at junctions
        const stitched = segments.reduce((acc, seg, i) => {
          return acc.concat(i === 0 ? seg : seg.slice(1))
        }, [])

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
        // Fallback: just upgrade the placeholder to a solid line
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
