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
