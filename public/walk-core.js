// Walk data + geofence logic, shared by the page and the evals.
// ponytail: waypoint coordinates are hand-picked approximations (±30 m); verify on site before a live demo.
export const WALKS = [
  {
    slug: 'old-indore', name: 'Old Indore: Holkar Heart', city: 'Indore', minutes: 25,
    waypoints: [
      { label: 'Rajwada', monument: 'Rajwada, Indore', lat: 22.7186, lng: 75.8553, radius: 60 },
      { label: 'Gopal Mandir', monument: 'Gopal Mandir, Indore', lat: 22.7181, lng: 75.8562, radius: 40 },
      { label: 'Kanch Mandir', monument: 'Kanch Mandir, Indore', lat: 22.7207, lng: 75.8568, radius: 40 },
      { label: 'Krishnapura Chhatris', monument: 'Krishnapura Chhatris, Indore', lat: 22.7176, lng: 75.8516, radius: 60 },
    ],
  },
  {
    slug: 'mahakal-ujjain', name: 'Mahakal to Ram Ghat', city: 'Ujjain', minutes: 30,
    waypoints: [
      { label: 'Mahakaleshwar Temple', monument: 'Mahakaleshwar Temple, Ujjain', lat: 23.1828, lng: 75.7682, radius: 80 },
      { label: 'Bade Ganesh ka Mandir', monument: 'Bade Ganesh Ka Mandir, Ujjain', lat: 23.1821, lng: 75.7675, radius: 40 },
      { label: 'Harsiddhi Temple', monument: 'Harsiddhi Temple, Ujjain', lat: 23.1816, lng: 75.7659, radius: 50 },
      { label: 'Ram Ghat', monument: 'Ram Ghat, Ujjain', lat: 23.1808, lng: 75.7637, radius: 70 },
    ],
  },
];

export function dist(a, b) { // metres, haversine
  const R = 6371e3, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Index of the first not-yet-played waypoint the walker is inside, or -1.
export function reachedWaypoint(pos, waypoints, played) {
  return waypoints.findIndex((w, i) => !played.has(i) && dist(pos, w) <= w.radius);
}

// Any-place walks: nearest heritage pages on Wikipedia around a point, ordered as a walking route.
const HERITAGE = /temple|mandir|fort|qila|palace|mahal|stepwell|vav|baori|baoli|masjid|mosque|church|cathedral|gurudwara|tomb|maqbara|chhatri|gate|darwaza|haveli|museum|ghat|stupa|cave|monument|rajwada|jyotirlinga|observatory/i;

export function orderRoute(start, pts) { // ponytail: greedy nearest-neighbour, fine for <=6 stops
  const out = [], left = [...pts];
  let p = start;
  while (left.length) { left.sort((a, b) => dist(p, a) - dist(p, b)); p = left.shift(); out.push(p); }
  return out;
}

const wiki = params => fetch('https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', origin: '*', ...params })).then(r => r.json());

export async function placeToPoint(q) {
  const s = await wiki({ action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '8', prop: 'coordinates' });
  const p = Object.values(s.query?.pages || {}).sort((a, b) => a.index - b.index).find(p => p.coordinates); // best-ranked hit that has a location
  if (!p?.coordinates) throw new Error(`Couldn't find "${q}". Try a well-known landmark nearby.`);
  return { lat: p.coordinates[0].lat, lng: p.coordinates[0].lon, name: p.title };
}

export async function nearbyWalk(start, label = 'Walk near you') {
  let picked = [];
  for (const radius of ['2000', '10000']) { // walkable first; widen for spread-out sites like Mandu
    const g = await wiki({ action: 'query', list: 'geosearch', gscoord: `${start.lat}|${start.lng}`, gsradius: radius, gslimit: '100' });
    const all = g.query?.geosearch || [];
    const heritage = all.filter(p => HERITAGE.test(p.title));
    picked = (heritage.length >= 3 ? heritage : all).slice(0, 5);
    if (picked.length >= 3) break;
  }
  if (!picked.length) throw new Error('No heritage places found nearby.');
  const waypoints = orderRoute(start, picked.map(p => ({ label: p.title, monument: p.title, lat: p.lat, lng: p.lon, radius: 50 })));
  return { slug: 'custom', name: label, city: '', minutes: Math.max(10, waypoints.length * 6), waypoints };
}
