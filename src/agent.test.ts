import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { generateWalkingTour } from './agent';
import { AUDIO_DIR } from './tools/generateAudio';

// Eval-driven development: the "Touch Grass" rules are enforced, not hoped for.
const realFetch = globalThis.fetch;
let elevenCalls = 0;
let lastBody: any = null;
function stubElevenLabs(behaviour: 'ok' | 'fail') {
  elevenCalls = 0;
  vi.stubGlobal('fetch', (url: any, init?: any) => {
    if (!String(url).includes('api.elevenlabs.io')) return realFetch(url, init);
    elevenCalls++;
    lastBody = JSON.parse(init?.body || '{}');
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
  }, 240_000);
});

describe('audio', () => {
  it('saves an mp3 of a sensible length', async () => {
    stubElevenLabs('ok');
    const t = await generateWalkingTour('Lal Bagh Palace, Indore');
    expect(t.audioUrl).toMatch(/^\/audio\/lal-bagh-palace-indore-rachel_\d+\.mp3$/);
    expect(existsSync(join(AUDIO_DIR, t.audioUrl!.slice('/audio/'.length)))).toBe(true);
    expect(t.duration).toBeGreaterThan(10);
    expect(t.duration).toBeLessThan(60);
  }, 240_000);

  it('falls back to text when ElevenLabs fails', async () => {
    stubElevenLabs('fail');
    const t = await generateWalkingTour('Kal Bhairav Temple, Ujjain');
    expect(t.script.length).toBeGreaterThan(0);
    expect(t.audioUrl).toBeNull();
    expect(t.warning).toContain('Audio generation failed');
  }, 240_000);

  it('caches: same monument twice = one ElevenLabs call', async () => {
    stubElevenLabs('ok');
    const a = await generateWalkingTour('Ram Ghat, Ujjain');
    const b = await generateWalkingTour('Ram Ghat, Ujjain');
    expect(b.audioUrl).toBe(a.audioUrl);
    expect(elevenCalls).toBe(1);
  }, 240_000);

  it('a different voice gets its own audio but reuses the script', async () => {
    stubElevenLabs('ok');
    const a = await generateWalkingTour('Ram Ghat, Ujjain', 'adam');
    const b = await generateWalkingTour('Ram Ghat, Ujjain', 'rachel');
    expect(a.audioUrl).toMatch(/-adam_/);
    expect(a.audioUrl).not.toBe(b.audioUrl);
    expect(a.script).toBe(b.script);
  }, 240_000);
});

describe('regional languages', () => {
  it('writes Hindi in Devanagari and keeps the touch-grass opening', async () => {
    stubElevenLabs('ok');
    const t = await generateWalkingTour('Rajwada, Indore', 'rachel', 'hi');
    expect(t.script).toMatch(/[\u0900-\u097F]/);  // Devanagari
    expect(t.script).toMatch(/नमस्ते|नमस्कार/);
    expect(t.script.split(/\s+/).length).toBeLessThanOrEqual(120);
  }, 180_000);

  it('voices Marathi with eleven_v3 and the language code', async () => {
    stubElevenLabs('ok');
    await generateWalkingTour('Gopal Mandir, Indore', 'rachel', 'mr');
    expect(lastBody.model_id).toBe('eleven_v3');
    expect(lastBody.language_code).toBe('mr');
  }, 180_000);

  it('unknown language falls back to English', async () => {
    stubElevenLabs('ok');
    await generateWalkingTour('Bade Ganesh Ka Mandir, Ujjain', 'rachel', 'xx');
    expect(lastBody.model_id).toBe('eleven_multilingual_v2');
    expect(lastBody.language_code).toBeUndefined();
  }, 180_000);
});
