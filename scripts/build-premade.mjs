// Builds the ready-made walks once from the live app (Gemma 4 + ElevenLabs) so they play instantly.
// Usage: node scripts/build-premade.mjs   (writes public/premade/<slug>.json + mp3s)
import { writeFileSync } from 'node:fs';
const OUT = new URL('../public/premade/', import.meta.url).pathname;
const API = process.env.API || 'https://dharohar-agent.onrender.com';
const { WALKS } = await import(new URL('../public/walk-core.js', import.meta.url));
for (const walk of WALKS) {
  const stops = [];
  for (const w of walk.waypoints) {
    let t = null;
    for (let attempt = 0; attempt < 3 && !t?.audioUrl; attempt++) {
      const r = await fetch(API + '/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monument: w.monument, voice: 'rachel', lang: 'en' }) });
      t = r.ok ? await r.json() : null;
      console.log(walk.slug, w.label, r.status, t?.audioUrl ? 'audio' : 'no audio');
    }
    if (!t?.audioUrl) throw new Error('failed ' + w.label);
    const file = `${walk.slug}-${stops.length + 1}.mp3`;
    writeFileSync(OUT + file, Buffer.from(await (await fetch(API + t.audioUrl)).arrayBuffer()));
    stops.push({ script: t.script, audioUrl: `/premade/${file}`, duration: t.duration });
  }
  writeFileSync(`${OUT}${walk.slug}.json`, JSON.stringify({ slug: walk.slug, voice: 'rachel', lang: 'en', stops }, null, 1));
  console.log('done', walk.slug);
}
