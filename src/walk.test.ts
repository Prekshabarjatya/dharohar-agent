import { describe, it, expect } from 'vitest';
// @ts-ignore plain JS module shared with the browser page
import { WALKS, dist, reachedWaypoint } from '../public/walk-core.js';

describe('geofence triggers', () => {
  const walk = WALKS[0];
  const [w0, w1] = walk.waypoints;

  it('every walk has 3-4 waypoints, all within a walkable 1.5 km', () => {
    for (const w of WALKS) {
      expect(w.waypoints.length).toBeGreaterThanOrEqual(3);
      expect(w.waypoints.length).toBeLessThanOrEqual(4);
      for (const p of w.waypoints) expect(dist(w.waypoints[0], p)).toBeLessThan(1500);
    }
  });

  it('fires when the walker is inside the radius', () => {
    expect(reachedWaypoint({ lat: w0.lat, lng: w0.lng }, walk.waypoints, new Set())).toBe(0);
  });

  it('does not fire 500 m away', () => {
    expect(reachedWaypoint({ lat: w0.lat + 0.0045, lng: w0.lng }, walk.waypoints, new Set())).toBe(-1);
  });

  it('never replays a stop already heard', () => {
    expect(reachedWaypoint({ lat: w0.lat, lng: w0.lng }, walk.waypoints, new Set([0]))).not.toBe(0);
    expect(reachedWaypoint({ lat: w1.lat, lng: w1.lng }, walk.waypoints, new Set([0]))).toBe(1);
  });
});
