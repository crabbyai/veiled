// ─── Geocoding & distance ───────────────────────────────────────────
// Turns a city/address into coordinates (for Passport) and computes real
// distances between members. Google or Mapbox; falls back to a small
// built-in city table + haversine so Passport still works offline.

const { config } = require('./config');

const CITY_COORDS = {
  london: [51.5074, -0.1278], manchester: [53.4808, -2.2426], birmingham: [52.4862, -1.8904],
  leeds: [53.8008, -1.5491], bristol: [51.4545, -2.5879], dubai: [25.2048, 55.2708],
  istanbul: [41.0082, 28.9784], cairo: [30.0444, 31.2357], 'kuala lumpur': [3.139, 101.6869],
  toronto: [43.6532, -79.3832], 'new york': [40.7128, -74.006], sydney: [-33.8688, 151.2093],
};

function haversine(a, b) {
  const R = 3958.8; // miles
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

async function geocode(place) {
  if (!place) return null;
  const key = String(place).trim().toLowerCase();
  if (CITY_COORDS[key]) return { lat: CITY_COORDS[key][0], lng: CITY_COORDS[key][1], source: 'builtin' };
  try {
    if (config.geo.provider === 'google') {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${config.geo.googleKey}`);
      const d = await res.json();
      const loc = d.results?.[0]?.geometry?.location;
      if (loc) return { lat: loc.lat, lng: loc.lng, source: 'google' };
    }
    if (config.geo.provider === 'mapbox') {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${config.geo.mapboxToken}&limit=1`);
      const d = await res.json();
      const c = d.features?.[0]?.center; // [lng, lat]
      if (c) return { lat: c[1], lng: c[0], source: 'mapbox' };
    }
  } catch (e) {
    console.error('[geo] geocode failed:', e.message);
  }
  return null;
}

async function distanceMiles(from, to) {
  const a = Array.isArray(from) ? from : await geocode(from);
  const b = Array.isArray(to) ? to : await geocode(to);
  if (!a || !b) return null;
  return haversine([a.lat ?? a[0], a.lng ?? a[1]], [b.lat ?? b[0], b.lng ?? b[1]]);
}

module.exports = { geocode, distanceMiles, haversine };
