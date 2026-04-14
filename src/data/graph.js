/**
 * Road graph for PUP Sta. Mesa ← various origins corridor
 * Destination is always PUP Gate.
 * Each node has: id, label, coords [lat, lng]
 * Each edge has: from, to, time (minutes), floodRisk (0=none, 1=moderate, 2=high)
 *
 * Flood references:
 *  - España Underpass: consistently floods during heavy rain (risk 2)
 *  - Nagtahan Bridge area: flood-prone, low-lying (risk 1)
 *  - Blumentritt / Tondo area: moderate flood risk (risk 1)
 *  - Anonas / New Manila area: moderate (risk 1)
 *  - Katipunan, Commonwealth: generally safe (risk 0)
 *
 * All major edges are bidirectional so any origin can reach PUP Gate.
 */

export const nodes = {
  // ── Destination (always fixed) ──────────────────────────────────────
  pup:              { id: 'pup',              label: 'PUP Gate',              coords: [14.5990, 121.0119] },

  // ── Intermediate / connector nodes ──────────────────────────────────
  dimasalang:       { id: 'dimasalang',       label: 'Dimasalang–España',     coords: [14.6050, 121.0020] },
  nagtahan:         { id: 'nagtahan',         label: 'Nagtahan Bridge',        coords: [14.6020, 120.9980] },
  espana_lacson:    { id: 'espana_lacson',    label: 'España–Lacson',          coords: [14.6100, 120.9935] },
  espana_underpass: { id: 'espana_underpass', label: 'España Underpass',       coords: [14.6080, 121.0080] },
  welcome_rotonda:  { id: 'welcome_rotonda',  label: 'Welcome Rotonda',        coords: [14.6180, 121.0025] },
  quezon_blvd:      { id: 'quezon_blvd',      label: 'Quezon Blvd',            coords: [14.6230, 121.0030] },
  anonas:           { id: 'anonas',           label: 'Anonas',                 coords: [14.6290, 121.0420] },
  cubao:            { id: 'cubao',            label: 'Cubao',                  coords: [14.6197, 121.0540] },
  new_manila:       { id: 'new_manila',       label: 'New Manila Junction',    coords: [14.6290, 121.0300] },
  katipunan:        { id: 'katipunan',        label: 'Katipunan Ave',          coords: [14.6490, 121.0740] },
  commonwealth:     { id: 'commonwealth',     label: 'Commonwealth Ave',       coords: [14.6600, 121.0500] },
  blumentritt:      { id: 'blumentritt',      label: 'Blumentritt (LRT-1)',     coords: [14.6115, 120.9822] },
  tayuman:          { id: 'tayuman',          label: 'Tayuman (LRT-1)',         coords: [14.6073, 120.9859] },
  bambang:          { id: 'bambang',          label: 'Bambang (LRT-1)',         coords: [14.6036, 120.9886] },

  // ── Origin-only nodes (farther starting points) ─────────────────────
  sm_sta_mesa:      { id: 'sm_sta_mesa',      label: 'SM Sta. Mesa',           coords: [14.5920, 121.0200] },
  pandacan:         { id: 'pandacan',         label: 'Pandacan (Shell Depot)',  coords: [14.5872, 121.0020] },
  san_andres:       { id: 'san_andres',       label: 'San Andres Bukid',        coords: [14.5814, 121.0090] },
  quiapo:           { id: 'quiapo',           label: 'Quiapo Church',           coords: [14.5982, 120.9843] },
  sampaloc_center:  { id: 'sampaloc_center',  label: 'Sampaloc (Mayon St)',     coords: [14.6120, 121.0115] },
  sta_cruz:         { id: 'sta_cruz',         label: 'Sta. Cruz (Carriedo)',    coords: [14.6000, 120.9833] },
  retiro:           { id: 'retiro',           label: 'Retiro (Araneta)',         coords: [14.6348, 121.0310] },
  santolan_lrt2:    { id: 'santolan_lrt2',    label: 'Santolan (LRT-2)',         coords: [14.6231, 121.0880] },
  marickina_malls:  { id: 'marickina_malls',  label: 'Marikina Riverbanks',     coords: [14.6388, 121.0994] },
  proj4:            { id: 'proj4',            label: 'Project 4 (QC)',           coords: [14.6327, 121.0610] },
  sta_mesa_hts:     { id: 'sta_mesa_hts',     label: 'Sta. Mesa Heights',        coords: [14.6090, 121.0200] },
  morayta:          { id: 'morayta',          label: 'Morayta (UST Area)',        coords: [14.6058, 120.9936] },
  mendiola:         { id: 'mendiola',         label: 'Mendiola (San Beda)',       coords: [14.5994, 120.9886] },
}

/**
 * Bidirectional adjacency list.
 * Helper to add both directions at once — keeps data DRY.
 */
function biEdge(adj, a, b, time, floodRisk) {
  adj[a] = adj[a] || []
  adj[b] = adj[b] || []
  adj[a].push({ to: b, time, floodRisk })
  adj[b].push({ to: a, time, floodRisk })
}

const _adj = {}
// Ensure every node has an entry (even leaf nodes)
Object.keys({
  pup:1, dimasalang:1, nagtahan:1, espana_lacson:1, espana_underpass:1,
  welcome_rotonda:1, quezon_blvd:1, anonas:1, cubao:1, new_manila:1,
  katipunan:1, commonwealth:1, blumentritt:1, tayuman:1, bambang:1,
  sm_sta_mesa:1, pandacan:1, san_andres:1, quiapo:1, sampaloc_center:1,
  sta_cruz:1, retiro:1, santolan_lrt2:1, marickina_malls:1, proj4:1,
  sta_mesa_hts:1, morayta:1, mendiola:1,
}).forEach(k => { _adj[k] = _adj[k] || [] })

// ── Core corridor (PUP ↔ España ↔ QC) ───────────────────────────────
biEdge(_adj, 'pup',              'dimasalang',       8,  0)
biEdge(_adj, 'pup',              'nagtahan',         5,  1)
biEdge(_adj, 'pup',              'espana_underpass', 7,  2)
biEdge(_adj, 'dimasalang',       'espana_lacson',    7,  0)
biEdge(_adj, 'dimasalang',       'welcome_rotonda',  11, 0)
biEdge(_adj, 'nagtahan',         'espana_lacson',    6,  0)
biEdge(_adj, 'nagtahan',         'espana_underpass', 5,  2)
biEdge(_adj, 'espana_underpass', 'espana_lacson',    4,  2)
biEdge(_adj, 'espana_underpass', 'welcome_rotonda',  5,  1)
biEdge(_adj, 'espana_lacson',    'welcome_rotonda',  6,  0)
biEdge(_adj, 'espana_lacson',    'quezon_blvd',      8,  0)
biEdge(_adj, 'welcome_rotonda',  'quezon_blvd',      4,  0)
biEdge(_adj, 'welcome_rotonda',  'new_manila',       9,  0)
biEdge(_adj, 'quezon_blvd',      'anonas',           10, 1)
biEdge(_adj, 'quezon_blvd',      'cubao',            14, 0)
biEdge(_adj, 'anonas',           'cubao',            5,  0)
biEdge(_adj, 'anonas',           'new_manila',       6,  1)
biEdge(_adj, 'anonas',           'katipunan',        12, 0)
biEdge(_adj, 'cubao',            'katipunan',        10, 0)
biEdge(_adj, 'cubao',            'commonwealth',     8,  0)
biEdge(_adj, 'new_manila',       'katipunan',        8,  0)
biEdge(_adj, 'new_manila',       'commonwealth',     12, 0)
biEdge(_adj, 'katipunan',        'commonwealth',     6,  0)

// ── LRT-1 south corridor (Blumentritt / Tayuman / Bambang → PUP area) ─
biEdge(_adj, 'blumentritt',  'espana_lacson',  8,  0)
biEdge(_adj, 'blumentritt',  'tayuman',        4,  0)
biEdge(_adj, 'tayuman',      'bambang',        3,  0)
biEdge(_adj, 'bambang',      'nagtahan',       5,  1)
biEdge(_adj, 'bambang',      'pup',            9,  0)

// ── Sta. Mesa / Pandacan area ────────────────────────────────────────
biEdge(_adj, 'sm_sta_mesa',  'pup',            6,  0)
biEdge(_adj, 'sm_sta_mesa',  'espana_underpass', 8, 1)
biEdge(_adj, 'pandacan',     'pup',            8,  1)
biEdge(_adj, 'pandacan',     'nagtahan',       7,  1)
biEdge(_adj, 'san_andres',   'pandacan',       6,  0)
biEdge(_adj, 'san_andres',   'pup',            12, 1)

// ── Sampaloc / Morayta / Mendiola ────────────────────────────────────
biEdge(_adj, 'sampaloc_center', 'dimasalang',   5,  0)
biEdge(_adj, 'sampaloc_center', 'espana_underpass', 4, 1)
biEdge(_adj, 'sampaloc_center', 'sta_mesa_hts', 6,  0)
biEdge(_adj, 'sta_mesa_hts',    'pup',          7,  0)
biEdge(_adj, 'sta_mesa_hts',    'espana_underpass', 5, 1)
biEdge(_adj, 'morayta',         'espana_lacson', 5, 0)
biEdge(_adj, 'morayta',         'dimasalang',   6,  0)
biEdge(_adj, 'morayta',         'mendiola',     4,  0)
biEdge(_adj, 'mendiola',        'nagtahan',     6,  1)
biEdge(_adj, 'mendiola',        'bambang',      5,  0)
biEdge(_adj, 'mendiola',        'quiapo',       5,  0)
biEdge(_adj, 'quiapo',          'sta_cruz',     4,  0)
biEdge(_adj, 'quiapo',          'bambang',      7,  0)
biEdge(_adj, 'sta_cruz',        'blumentritt',  5,  0)

// ── QC north / east ──────────────────────────────────────────────────
biEdge(_adj, 'retiro',          'new_manila',    6,  0)
biEdge(_adj, 'retiro',          'cubao',         7,  0)
biEdge(_adj, 'retiro',          'proj4',         5,  0)
biEdge(_adj, 'proj4',           'cubao',         5,  0)
biEdge(_adj, 'proj4',           'santolan_lrt2', 8,  0)
biEdge(_adj, 'santolan_lrt2',   'marickina_malls', 8, 0)
biEdge(_adj, 'santolan_lrt2',   'katipunan',    10,  0)
biEdge(_adj, 'marickina_malls', 'katipunan',    14,  0)

export const adjacency = _adj

export const FLOOD_RISK_LABELS = {
  0: { label: 'None (Safe)', color: '#22c55e' },
  1: { label: 'Moderate',   color: '#f97316' },
  2: { label: 'High',       color: '#ef4444' },
}
