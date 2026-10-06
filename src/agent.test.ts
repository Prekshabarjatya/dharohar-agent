import { describe, it, expect } from 'vitest';
import { generateWalkingTour } from './agent';

// Eval-driven development: the "Touch Grass" rules are enforced, not hoped for.
describe.each(['Rajwada, Indore', 'Mahakaleshwar Temple, Ujjain'])('Dharohar guide: %s', (monument) => {
  it('writes a short, audio-only script', async () => {
    const script = await generateWalkingTour(monument);
    const lower = script.toLowerCase();

    expect(script.trim().split(/\s+/).length).toBeLessThanOrEqual(100);
    expect(lower).not.toMatch(/\b(screen|click|tap|app|map|scroll)\b/); // word-boundary, so "approach" is fine
    expect(lower).toMatch(/^namaste/);
    expect(lower).toContain('pocket');
  }, 120_000);
});
