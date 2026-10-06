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
  let picked = [], fallback = [];
  for (const radius of ['2000', '10000']) { // walkable first; widen for spread-out sites (Mandu) or modern areas
    const g = await wiki({ action: 'query', list: 'geosearch', gscoord: `${start.lat}|${start.lng}`, gsradius: radius, gslimit: '200' });
    const all = g.query?.geosearch || [];
    picked = all.filter(p => HERITAGE.test(p.title)).slice(0, 5);
    if (!fallback.length) fallback = all.slice(0, 5);
    if (picked.length >= 3) break;
  }
  if (picked.length < 2) picked = fallback; // no heritage anywhere near: show what's there
  if (!picked.length) throw new Error('No heritage places found nearby.');
  const waypoints = orderRoute(start, picked.map(p => ({ label: p.title, monument: p.title, lat: p.lat, lng: p.lon, radius: 50 })));
  return { slug: 'custom', name: label, city: '', minutes: Math.max(10, waypoints.length * 6), waypoints };
}

// "Explore a city": India's major heritage cities, each anchored at its best-known monument.
// `walk` = a hand-made walk with pre-generated audio (instant); others are built from Wikipedia on tap.
// ponytail: anchors are approximate (±200 m); nearbyWalk searches 2-10 km around them anyway.
export const CITIES = [
  { name: 'Indore', anchor: 'Rajwada', lat: 22.7186, lng: 75.8553, walk: 'old-indore' },
  { name: 'Ujjain', anchor: 'Mahakaleshwar Temple', lat: 23.1828, lng: 75.7682, walk: 'mahakal-ujjain' },
  { name: 'Delhi', anchor: 'Red Fort', lat: 28.6562, lng: 77.2410 },
  { name: 'Agra', anchor: 'Taj Mahal', lat: 27.1751, lng: 78.0421 },
  { name: 'Jaipur', anchor: 'Hawa Mahal', lat: 26.9239, lng: 75.8267 },
  { name: 'Varanasi', anchor: 'Dashashwamedh Ghat', lat: 25.3060, lng: 83.0104 },
  { name: 'Udaipur', anchor: 'City Palace', lat: 24.5764, lng: 73.6835 },
  { name: 'Hampi', anchor: 'Virupaksha Temple', lat: 15.3350, lng: 76.4600 },
  { name: 'Mysuru', anchor: 'Mysore Palace', lat: 12.3052, lng: 76.6552 },
  { name: 'Hyderabad', anchor: 'Charminar', lat: 17.3616, lng: 78.4747 },
  { name: 'Kolkata', anchor: 'Victoria Memorial', lat: 22.5448, lng: 88.3426 },
  { name: 'Amritsar', anchor: 'Golden Temple', lat: 31.6200, lng: 74.8765 },
  { name: 'Lucknow', anchor: 'Bara Imambara', lat: 26.8692, lng: 80.9128 },
  { name: 'Ahmedabad', anchor: 'Sidi Saiyyed Mosque', lat: 23.0270, lng: 72.5810 },
  { name: 'Khajuraho', anchor: 'Kandariya Mahadeva Temple', lat: 24.8525, lng: 79.9199 },
  { name: 'Madurai', anchor: 'Meenakshi Temple', lat: 9.9195, lng: 78.1193 },
  { name: 'Gwalior', anchor: 'Gwalior Fort', lat: 26.2304, lng: 78.1689 },
  { name: 'Mandu', anchor: 'Jahaz Mahal', lat: 22.3550, lng: 75.3960 },
];

export function bearingWord(a, b) { // compass direction from a to b, for "140 m north-east"
  const r = Math.PI / 180, y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
  const deg = (Math.atan2(y, x) / r + 360) % 360;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];
}
