// POST /script {monument} -> {script}. Plain node:http, runs on Render or a DigitalOcean Droplet as-is.
import { createServer } from 'node:http';
import { generateWalkingTour } from './agent';

const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://dharohar-a03.pages.dev,http://localhost:8000').split(',');

createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method === 'GET' && req.url === '/health') return res.end('ok');
  if (req.method !== 'POST' || req.url !== '/script') return res.writeHead(404).end();

  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 2000) return res.writeHead(413).end(); }
  const monument = (() => { try { return JSON.parse(body).monument } catch { return null } })();
  if (typeof monument !== 'string' || !monument.trim() || monument.length > 200) return res.writeHead(400).end('bad monument');

  try {
    const script = await generateWalkingTour(monument.trim());
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ script }));
  } catch (e) {
    console.error(e);
    res.writeHead(502).end('agent failed');
  }
}).listen(Number(process.env.PORT) || 8787, () => console.log('dharohar agent on', process.env.PORT || 8787));
