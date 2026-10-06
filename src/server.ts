// POST /script {monument, voice?} -> {script, audioUrl, duration, warning?}; GET / serves the walk UI from public/. Plain node:http, runs on Render or a DigitalOcean Droplet as-is.
import './instrument';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { generateWalkingTour, MODEL_INFO } from './agent';
import { VOICES } from './tools/generateAudio';
import * as Sentry from '@sentry/node';

const PUBLIC = join(process.cwd(), 'public');
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/manifest+json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8000').split(',');

createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method === 'GET' && req.url === '/health') return res.end(`ok ${MODEL_INFO}`);
  if (req.method === 'GET') {
    const path = normalize(join(PUBLIC, decodeURIComponent((req.url || '/').split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url!.split('?')[0])));
    if (!path.startsWith(PUBLIC + sep)) return res.writeHead(403).end(); // blocks ../ traversal
    return readFile(path).then(b => res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' }).end(b), () => res.writeHead(404).end());
  }
  if (req.method !== 'POST' || req.url !== '/script') return res.writeHead(404).end();

  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 2000) return res.writeHead(413).end(); }
  const { monument, voice = 'rachel' } = (() => { try { return JSON.parse(body) } catch { return {} } })();
  if (typeof monument !== 'string' || !monument.trim() || monument.length > 200) return res.writeHead(400).end('bad monument');
  if (!(voice in VOICES)) return res.writeHead(400).end('bad voice');

  try {
    const tour = await generateWalkingTour(monument.trim(), voice);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(tour));
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);
    // short reason only, no stack; keys travel in headers so they never appear in these messages
    res.writeHead(502).end(`agent failed: ${String((e as Error).message).slice(0, 200)}`);
  }
}).listen(Number(process.env.PORT) || 8787, () => console.log('dharohar agent on', process.env.PORT || 8787));
