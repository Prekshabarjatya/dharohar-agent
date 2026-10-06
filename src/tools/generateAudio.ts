import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const AUDIO_DIR = join(process.cwd(), 'public', 'audio');
// ElevenLabs premade voices offered in the UI. Allowlist: the client can only pick one of these.
export const VOICES: Record<string, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM', // calm female
  adam: 'pNInz6obpgDQGcFmaJgB',   // deep male
  domi: 'AZnzlk1XvdvUeBnXmlld',   // bright female
  antoni: 'ErXwobaYiN019PkySvjV', // warm male
};
export type Voice = keyof typeof VOICES;

// ponytail: in-memory cache + local disk; on Render free the disk resets on redeploy. Move to S3/R2 if audio must persist.
export const audioCache = new Map<string, string>();

export type AudioResult = { audioUrl: string | null; duration: number; warning?: string };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stop';

export async function textToAudio(text: string, monument: string, voice: string = 'rachel'): Promise<AudioResult> {
  if (!VOICES[voice]) voice = 'rachel';
  const key = `${voice}|${monument}`;
  const duration = Math.ceil(text.split(/\s+/).length / 2.5); // ~150 words/min, seconds
  const cached = audioCache.get(key);
  if (cached) return { audioUrl: cached, duration };
  try {
    if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not set');
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice]}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    });
    if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}`);
    mkdirSync(AUDIO_DIR, { recursive: true });
    const fileName = `${slug(monument)}-${voice}_${Date.now()}.mp3`;
    writeFileSync(join(AUDIO_DIR, fileName), Buffer.from(await res.arrayBuffer()));
    const audioUrl = `/audio/${fileName}`;
    audioCache.set(key, audioUrl);
    return { audioUrl, duration };
  } catch (e) {
    console.error('audio:', (e as Error).message);
    return { audioUrl: null, duration, warning: 'Audio generation failed, text only' };
  }
}

export const generateAudio = createTool({
  id: 'generate-audio',
  description: 'Convert a walking tour script to spoken MP3 audio with ElevenLabs.',
  inputSchema: z.object({ text: z.string(), monument: z.string(), voice: z.enum(['rachel', 'adam', 'domi', 'antoni']).default('rachel') }),
  execute: async ({ text, monument, voice }) => textToAudio(text, monument, voice),
});
