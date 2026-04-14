/**
 * Road graph for PUP Sta. Mesa → Quezon City corridor
 * Each node has: id, label, coords [lat, lng]
 * Each edge has: from, to, time (minutes), floodRisk (0=none, 1=moderate, 2=high)
 *
 * Flood references:
 *  - España Underpass: consistently floods during heavy rain (risk 2)
 *  - Nagtahan Bridge area: flood-prone, low-lying (risk 1)
 *  - Anonas / New Manila area: moderate (risk 1)
 *  - Katipunan, Commonwealth: generally safe (risk 0)
 */

export const nodes = {
  pup: { id: 'pup', label: 'PUP Gate', coords: [14.5990, 121.0119] },
  dimasalang: { id: 'dimasalang', label: 'Dimasalang–España', coords: [14.6050, 121.0020] },
  nagtahan: { id: 'nagtahan', label: 'Nagtahan Bridge', coords: [14.6020, 120.9980] },
  espana_lacson: { id: 'espana_lacson', label: 'España–Lacson', coords: [14.6100, 120.9935] },
  espana_underpass: { id: 'espana_underpass', label: 'España Underpass', coords: [14.6080, 121.0080] },
  welcome_rotonda: { id: 'welcome_rotonda', label: 'Welcome Rotonda', coords: [14.6180, 121.0025] },
  quezon_blvd: { id: 'quezon_blvd', label: 'Quezon Blvd', coords: [14.6230, 121.0030] },
  anonas: { id: 'anonas', label: 'Anonas', coords: [14.6290, 121.0420] },
  cubao: { id: 'cubao', label: 'Cubao', coords: [14.6197, 121.0540] },
  new_manila: { id: 'new_manila', label: 'New Manila', coords: [14.6290, 121.0300] },
  katipunan: { id: 'katipunan', label: 'Katipunan', coords: [14.6490, 121.0740] },
  commonwealth: { id: 'commonwealth', label: 'Commonwealth Ave', coords: [14.6600, 121.0500] },
}

// Directed adjacency list: each entry = { to, time, floodRisk }
export const adjacency = {
  pup: [
    { to: 'dimasalang', time: 8, floodRisk: 0 }, // Flood-free bypass via Dimasalang St
    { to: 'nagtahan', time: 5, floodRisk: 1 }, // Faster but flood-prone
    { to: 'espana_underpass', time: 7, floodRisk: 2 }, // High flood risk
  ],
  dimasalang: [
    { to: 'espana_lacson', time: 7, floodRisk: 0 }, // Flood-free to España–Lacson
    { to: 'welcome_rotonda', time: 11, floodRisk: 0 }, // Flood-free to Welcome Rotonda
  ],
  nagtahan: [
    { to: 'espana_lacson', time: 6, floodRisk: 0 },
    { to: 'espana_underpass', time: 5, floodRisk: 2 },
  ],
  espana_lacson: [
    { to: 'welcome_rotonda', time: 6, floodRisk: 0 },
    { to: 'quezon_blvd', time: 8, floodRisk: 0 },
  ],
  espana_underpass: [
    { to: 'espana_lacson', time: 4, floodRisk: 2 },
    { to: 'welcome_rotonda', time: 5, floodRisk: 1 },
  ],
  welcome_rotonda: [
    { to: 'quezon_blvd', time: 4, floodRisk: 0 },
    { to: 'new_manila', time: 9, floodRisk: 0 },
  ],
  quezon_blvd: [
    { to: 'anonas', time: 10, floodRisk: 1 },
    { to: 'cubao', time: 14, floodRisk: 0 },
  ],
  anonas: [
    { to: 'cubao', time: 5, floodRisk: 0 },
    { to: 'new_manila', time: 6, floodRisk: 1 },
    { to: 'katipunan', time: 12, floodRisk: 0 },
  ],
  cubao: [
    { to: 'katipunan', time: 10, floodRisk: 0 },
    { to: 'commonwealth', time: 8, floodRisk: 0 },
  ],
  new_manila: [
    { to: 'katipunan', time: 8, floodRisk: 0 },
    { to: 'commonwealth', time: 12, floodRisk: 0 },
  ],
  katipunan: [
    { to: 'commonwealth', time: 6, floodRisk: 0 },
  ],
  commonwealth: [],
};

export const FLOOD_RISK_LABELS = {
  0: { label: 'None (Safe)', color: '#22c55e' },
  1: { label: 'Moderate', color: '#f97316' },
  2: { label: 'High', color: '#ef4444' },
}
