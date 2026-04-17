/**
 * Road graph for Metro Manila — PUP corridor
 *
 * Each node has: id, label, coords [lat, lng]
 * Each edge has: from, to, time (minutes), flood_level (0=none,1=moderate,2=high),
 *                intersection_ratio (0.0–1.0, portion of road overlapping flood zone)
 *
 * Risk score per edge = flood_level * intersection_ratio
 *
 * Flood references (based on 5-year return period flood map):
 *  - España Underpass / Welcome Rotonda / Quezon Blvd corridor: heavily flooded
 *  - Magsaysay Blvd / España–Lacson area: moderately flooded
 *  - Nagtahan Bridge approach: flood-prone, low-lying
 *  - LRT-1 corridor (Blumentritt/Tayuman/Bambang): elevated, flood-free
 *  - C-3 / Avenida corridor (N. Domingo → Blumentritt): flood-free alternative
 *  - Katipunan, Commonwealth: generally safe
 */

export const nodes = {
  // ── Key destinations ──────────────────────────────────────────────────
  pup:              { id: 'pup',              label: 'PUP Gate',              coords: [14.5990, 121.0119] },

  // ── Core corridor intermediates ────────────────────────────────────────
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

  // ── LRT-1 corridor (flood-free, elevated roads) ────────────────────────
  blumentritt:      { id: 'blumentritt',      label: 'Blumentritt (LRT-1)',     coords: [14.6115, 120.9822] },
  tayuman:          { id: 'tayuman',          label: 'Tayuman (LRT-1)',         coords: [14.6073, 120.9859] },
  bambang:          { id: 'bambang',          label: 'Bambang (LRT-1)',         coords: [14.6036, 120.9886] },

  // ── C-3 / Avenida bypass (flood-free alternative from QC to LRT corridor)
  avenida:          { id: 'avenida',          label: 'Avenida (C-3 Bypass)',   coords: [14.6130, 121.0000] },

  // ── Selectable origins ─────────────────────────────────────────────────
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
 * Compute the continuous risk score for an edge.
 * risk = flood_level * intersection_ratio
 * Range: 0.0 (safe) → 2.0 (fully flooded high-risk road)
 */
export function computeRisk(edge) {
  return edge.flood_level * edge.intersection_ratio
}

/**
 * Bidirectional adjacency list.
 * Edge schema: { to, time, flood_level, intersection_ratio }
 */
function biEdge(adj, a, b, time, flood_level, intersection_ratio) {
  adj[a] = adj[a] || []
  adj[b] = adj[b] || []
  adj[a].push({ to: b, time, flood_level, intersection_ratio })
  adj[b].push({ to: a, time, flood_level, intersection_ratio })
}

const _adj = {}
Object.keys({
  pup:1, dimasalang:1, nagtahan:1, espana_lacson:1, espana_underpass:1,
  welcome_rotonda:1, quezon_blvd:1, anonas:1, cubao:1, new_manila:1,
  katipunan:1, commonwealth:1, blumentritt:1, tayuman:1, bambang:1,
  avenida:1,
  sm_sta_mesa:1, pandacan:1, san_andres:1, quiapo:1, sampaloc_center:1,
  sta_cruz:1, retiro:1, santolan_lrt2:1, marickina_malls:1, proj4:1,
  sta_mesa_hts:1, morayta:1, mendiola:1,
}).forEach(k => { _adj[k] = _adj[k] || [] })

// ─────────────────────────────────────────────────────────────────────────────
// FLOODED CORRIDOR — España / Welcome Rotonda / Quezon Blvd
//
// This entire central corridor floods during 5-yr events (brown on map).
// Edges here have non-zero flood risk so SAFEST/BALANCED reroutes around them.
// ─────────────────────────────────────────────────────────────────────────────
//                              time  flood_level  intersection_ratio
biEdge(_adj, 'pup',              'dimasalang',        8,  0, 0.00)  // R. Papa St — safe
biEdge(_adj, 'pup',              'nagtahan',          5,  1, 0.40)  // Nagtahan bridge approach
biEdge(_adj, 'pup',              'espana_underpass',  7,  2, 0.85)  // Underpass floods badly
biEdge(_adj, 'dimasalang',       'espana_lacson',     7,  0, 0.00)  // TM Kalaw — safe
biEdge(_adj, 'dimasalang',       'welcome_rotonda',  11,  1, 0.55)  // ← FLOODED (central corridor)
biEdge(_adj, 'nagtahan',         'espana_lacson',     6,  0, 0.05)
biEdge(_adj, 'nagtahan',         'espana_underpass',  5,  2, 0.90)  // Deep underpass
biEdge(_adj, 'espana_underpass', 'espana_lacson',     4,  2, 0.90)  // Underpass to Lacson
biEdge(_adj, 'espana_underpass', 'welcome_rotonda',   5,  1, 0.35)
biEdge(_adj, 'espana_lacson',    'welcome_rotonda',   6,  1, 0.55)  // ← FLOODED España stretch
biEdge(_adj, 'espana_lacson',    'quezon_blvd',       8,  1, 0.40)  // ← FLOODED Magsaysay–Lacson
biEdge(_adj, 'welcome_rotonda',  'quezon_blvd',       4,  1, 0.70)  // ← HEAVILY FLOODED
biEdge(_adj, 'welcome_rotonda',  'new_manila',        9,  1, 0.30)  // ← Moderate (Magsaysay north)
biEdge(_adj, 'quezon_blvd',      'anonas',           10,  1, 0.30)  // Low-lying stretch
biEdge(_adj, 'quezon_blvd',      'cubao',            14,  1, 0.45)  // ← FLOODED Quezon Ave
biEdge(_adj, 'anonas',           'cubao',             5,  0, 0.00)
biEdge(_adj, 'anonas',           'new_manila',        6,  1, 0.15)
biEdge(_adj, 'anonas',           'katipunan',        12,  0, 0.00)
biEdge(_adj, 'cubao',            'katipunan',        10,  0, 0.00)
biEdge(_adj, 'cubao',            'commonwealth',      8,  0, 0.00)
biEdge(_adj, 'new_manila',       'katipunan',         8,  0, 0.00)
biEdge(_adj, 'new_manila',       'commonwealth',     12,  0, 0.00)
biEdge(_adj, 'katipunan',        'commonwealth',      6,  0, 0.00)

// ─────────────────────────────────────────────────────────────────────────────
// FLOOD-FREE ALTERNATIVE — LRT-1 Corridor (elevated road)
// Blumentritt → Tayuman → Bambang → PUP (all safe)
// ─────────────────────────────────────────────────────────────────────────────
biEdge(_adj, 'blumentritt',  'espana_lacson',   8,  1, 0.20)  // Brief España crossing
biEdge(_adj, 'blumentritt',  'tayuman',         4,  0, 0.00)  // Along LRT tracks — safe
biEdge(_adj, 'tayuman',      'bambang',         3,  0, 0.00)  // Along LRT tracks — safe
biEdge(_adj, 'bambang',      'nagtahan',        5,  1, 0.30)
biEdge(_adj, 'bambang',      'pup',             9,  0, 0.00)  // Direct to PUP — safe

// ─────────────────────────────────────────────────────────────────────────────
// FLOOD-FREE ALTERNATIVE — Avenida C-3 Bypass
//
// Connects QC / Cubao / Retiro to the LRT corridor WITHOUT going through
// the flooded España / Welcome Rotonda area. SAFEST routes use this.
// Travel times are longer (+5–10 min) but risk = 0.
// ─────────────────────────────────────────────────────────────────────────────
biEdge(_adj, 'cubao',       'avenida',          20,  0, 0.00)  // Araneta→Avenida, bypass España
biEdge(_adj, 'retiro',      'avenida',          16,  0, 0.00)  // Retiro→Avenida, bypass España
biEdge(_adj, 'new_manila',  'avenida',          14,  0, 0.05)  // New Manila→Avenida
biEdge(_adj, 'avenida',     'blumentritt',      10,  0, 0.00)  // Avenida→Blumentritt, flood-free
biEdge(_adj, 'avenida',     'espana_lacson',     6,  0, 0.10)  // Short hop, mostly safe
biEdge(_adj, 'avenida',     'dimasalang',        8,  0, 0.00)  // Avenida→Dimasalang, flood-free

// ─────────────────────────────────────────────────────────────────────────────
// Sta. Mesa / Pandacan area
// ─────────────────────────────────────────────────────────────────────────────
biEdge(_adj, 'sm_sta_mesa',  'pup',               6,  0, 0.00)
biEdge(_adj, 'sm_sta_mesa',  'espana_underpass',  8,  1, 0.30)
biEdge(_adj, 'pandacan',     'pup',               8,  1, 0.30)
biEdge(_adj, 'pandacan',     'nagtahan',          7,  1, 0.35)
biEdge(_adj, 'san_andres',   'pandacan',          6,  0, 0.00)
biEdge(_adj, 'san_andres',   'pup',              12,  1, 0.25)

// ─────────────────────────────────────────────────────────────────────────────
// Sampaloc / Morayta / Mendiola
// ─────────────────────────────────────────────────────────────────────────────
biEdge(_adj, 'sampaloc_center', 'dimasalang',          5,  0, 0.00)
biEdge(_adj, 'sampaloc_center', 'espana_underpass',    4,  1, 0.40)
biEdge(_adj, 'sampaloc_center', 'sta_mesa_hts',        6,  0, 0.00)
biEdge(_adj, 'sampaloc_center', 'avenida',             4,  0, 0.00)  // Sampaloc → Avenida bypass
biEdge(_adj, 'sta_mesa_hts',    'pup',                 7,  0, 0.00)
biEdge(_adj, 'sta_mesa_hts',    'espana_underpass',    5,  1, 0.35)
biEdge(_adj, 'morayta',         'espana_lacson',       5,  1, 0.20)  // Slight flood risk
biEdge(_adj, 'morayta',         'dimasalang',          6,  0, 0.00)
biEdge(_adj, 'morayta',         'mendiola',            4,  0, 0.00)
biEdge(_adj, 'mendiola',        'nagtahan',            6,  1, 0.30)
biEdge(_adj, 'mendiola',        'bambang',             5,  0, 0.00)
biEdge(_adj, 'mendiola',        'quiapo',              5,  0, 0.00)
biEdge(_adj, 'quiapo',          'sta_cruz',            4,  0, 0.00)
biEdge(_adj, 'quiapo',          'bambang',             7,  0, 0.00)
biEdge(_adj, 'sta_cruz',        'blumentritt',         5,  0, 0.00)

// ─────────────────────────────────────────────────────────────────────────────
// QC north / east
// ─────────────────────────────────────────────────────────────────────────────
biEdge(_adj, 'retiro',          'new_manila',      6,  0, 0.00)
biEdge(_adj, 'retiro',          'cubao',           7,  0, 0.00)
biEdge(_adj, 'retiro',          'proj4',           5,  0, 0.00)
biEdge(_adj, 'proj4',           'cubao',           5,  0, 0.00)
biEdge(_adj, 'proj4',           'santolan_lrt2',   8,  0, 0.00)
biEdge(_adj, 'santolan_lrt2',   'marickina_malls', 8,  0, 0.00)
biEdge(_adj, 'santolan_lrt2',   'katipunan',      10,  0, 0.00)
biEdge(_adj, 'marickina_malls', 'katipunan',      14,  0, 0.00)

export const adjacency = _adj

/** Risk level labels based on computed risk score thresholds */
export const RISK_LEVEL = {
  NONE:     { label: 'None',     color: '#22c55e', min: 0.00 },
  LOW:      { label: 'Low',      color: '#84cc16', min: 0.05 },
  MODERATE: { label: 'Moderate', color: '#f97316', min: 0.30 },
  HIGH:     { label: 'High',     color: '#ef4444', min: 0.80 },
}

/** Map a numeric risk score to its level metadata */
export function getRiskLevel(score) {
  if (score >= RISK_LEVEL.HIGH.min)     return RISK_LEVEL.HIGH
  if (score >= RISK_LEVEL.MODERATE.min) return RISK_LEVEL.MODERATE
  if (score >= RISK_LEVEL.LOW.min)      return RISK_LEVEL.LOW
  return RISK_LEVEL.NONE
}

export const FLOOD_RISK_LABELS = {
  0: { label: 'None (Safe)', color: '#22c55e' },
  1: { label: 'Moderate',   color: '#f97316' },
  2: { label: 'High',       color: '#ef4444' },
}
