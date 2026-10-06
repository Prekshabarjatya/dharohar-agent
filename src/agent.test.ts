import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { generateWalkingTour } from './agent';
import { AUDIO_DIR } from './tools/generateAudio';

// Eval-driven development: the "Touch Grass" rules are enforced, not hoped for.
const realFetch = globalThis.fetch;
let elevenCalls = 0;
function stubElevenLabs(behaviour: 'ok' | 'fail') {
  elevenCalls = 0;
  vi.stubGlobal('fetch', (url: any, init?: any) => {
    if (!String(url).includes('api.elevenlabs.io')) return realFetch(url, init);
    elevenCalls++;
    return Promise.resolve(behaviour === 'ok'
      ? new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), { status: 200 })
      : new Response('quota exceeded', { status: 401 }));
  });
  process.env.ELEVENLABS_API_KEY ||= 'test-key';
}
afterEach(() => vi.unstubAllGlobals());
afterAll(() => { // remove the 4-byte fake mp3s the stub wrote
  for (const f of readdirSync(AUDIO_DIR)) if (f.endsWith('.mp3') && statSync(join(AUDIO_DIR, f)).size < 100) unlinkSync(join(AUDIO_DIR, f));
});

describe.each(['Rajwada, Indore', 'Mahakaleshwar Temple, Ujjain'])('script rules: %s', (monument) => {
  it('writes a short, audio-only script', async () => {
    stubElevenLabs('ok');
    const { script } = await generateWalkingTour(monument);
    const lower = script.toLowerCase();
    expect(script.trim().split(/\s+/).length).toBeLessThanOrEqual(100);
    expect(lower).not.toMatch(/\b(screen|click|tap|app|map|scroll)\b/); // word-boundary, so "approach" is fine
    expect(lower).toMatch(/^namaste/);
    expect(lower).toContain('pocket');
  }, 120_000);
});

describe('audio', () => {
  it('saves an mp3 of a sensible length', async () => {
    stubElevenLabs('ok');
    const t = await generateWalkingTour('Lal Bagh Palace, Indore');
    expect(t.audioUrl).toMatch(/^\/audio\/lal-bagh-palace-indore-rachel_\d+\.mp3$/);
    expect(existsSync(join(AUDIO_DIR, t.audioUrl!.slice('/audio/'.length)))).toBe(true);
    expect(t.duration).toBeGreaterThan(10);
    expect(t.duration).toBeLessThan(60);
  }, 120_000);

  it('falls back to text when ElevenLabs fails', async () => {
    stubElevenLabs('fail');
    const t = await generateWalkingTour('Kal Bhairav Temple, Ujjain');
    expect(t.script.length).toBeGreaterThan(0);
    expect(t.audioUrl).toBeNull();
    expect(t.warning).toContain('Audio generation failed');
  }, 120_000);

  it('caches: same monument twice = one ElevenLabs call', async () => {
    stubElevenLabs('ok');
    const a = await generateWalkingTour('Ram Ghat, Ujjain');
    const b = await generateWalkingTour('Ram Ghat, Ujjain');
    expect(b.audioUrl).toBe(a.audioUrl);
    expect(elevenCalls).toBe(1);
  }, 120_000);

  it('a different voice gets its own audio but reuses the script', async () => {
    stubElevenLabs('ok');
    const a = await generateWalkingTour('Ram Ghat, Ujjain', 'adam');
    const b = await generateWalkingTour('Ram Ghat, Ujjain', 'rachel');
    expect(a.audioUrl).toMatch(/-adam_/);
    expect(a.audioUrl).not.toBe(b.audioUrl);
    expect(a.script).toBe(b.script);
  }, 120_000);
});
