import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core';
import { createTool } from '@mastra/core/tools';
import { createOllama } from 'ollama-ai-provider-v2';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { generateAudio, textToAudio, type AudioResult } from './tools/generateAudio';

// 1. SerpApi tool: live facts about a monument
export const searchHeritage = createTool({
  id: 'search-heritage',
  description: 'Search for live, recent historical facts and ASI updates about an Indian monument.',
  inputSchema: z.object({
    monument: z.string().describe('Monument and city, e.g. "Rajwada, Indore"'),
  }),
  execute: async ({ monument }) => {
    if (!process.env.SERPAPI_KEY) return 'No live data (SERPAPI_KEY not set).';
    const q = new URLSearchParams({ engine: 'google', q: `${monument} history`, num: '5', api_key: process.env.SERPAPI_KEY });
    const res = await fetch(`https://serpapi.com/search.json?${q}`);
    if (!res.ok) return `No live data (SerpApi HTTP ${res.status}).`;
    const data: any = await res.json();
    return data.organic_results?.slice(0, 5).map((r: any) => `${r.title}: ${r.snippet}`).join('\n') || 'No recent data found.';
  },
});

// 2. Gemma: Google AI Studio > Groq > local Ollama, whichever key is set
const MODEL_NAME = process.env.GOOGLE_GENERATIVE_AI_API_KEY ? process.env.GOOGLE_MODEL || 'gemma-4-26b-a4b-it'
  : process.env.GROQ_API_KEY ? process.env.GROQ_MODEL || 'gemma2-9b-it'
  : process.env.OLLAMA_MODEL || 'gemma3:4b';
const PROVIDER = process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'google' : process.env.GROQ_API_KEY ? 'groq' : 'ollama';
export const MODEL_INFO = `${PROVIDER}/${MODEL_NAME}`;
const model = PROVIDER === 'google' ? createGoogleGenerativeAI()(MODEL_NAME)
  : PROVIDER === 'groq' ? createGroq()(MODEL_NAME)
  : createOllama({ baseURL: process.env.OLLAMA_URL || 'http://localhost:11434/api' })(MODEL_NAME);

export const dharoharGuide = new Agent({
  id: 'dharohar-guide',
  name: 'Dharohar Guide',
  instructions: `You are an expert Indian heritage storyteller writing audio for someone walking.
RULES:
1. Write one spoken script under 90 words. Plain sentences only, no headings, no lists, no markdown.
2. Use ONLY physical, real-world cues about features named in the facts (gates, walls, domes, steps). Never invent features that are not in the facts.
3. NEVER mention screens, maps, clicking, apps, or anything to look at on a device.
4. Start exactly with: "Namaste. Put your phone in your pocket, and let's walk."
5. Use only the facts you are given. Do not invent dates or names.`,
  model,
});

export const mastra = new Mastra({ agents: { dharoharGuide } });
export const tools = { searchHeritage, generateAudio };

// 3. fetch context -> generate constrained script -> speak it.
// Gemma has no native tool-calling in Ollama, so the pipeline calls the tools in order instead of the model choosing.
/** Output: { script, audioUrl: "/audio/<slug>_<ts>.mp3" | null, duration: seconds, warning?: string } */
export type Tour = AudioResult & { script: string };

// Sentry agent tracing: one invoke_agent span per tour, child spans per tool call and LLM call
// (gen_ai.* ops/attributes, so they show up in Sentry's AI Agents view). No-ops when SENTRY_DSN is unset.

export async function generateScript(monument: string) {
  const facts = await Sentry.startSpan(
    { op: 'gen_ai.execute_tool', name: 'execute_tool search-heritage', attributes: { 'gen_ai.tool.name': 'search-heritage', monument } },
    async (span) => {
      const f = String(await searchHeritage.execute!({ monument }, {} as any));
      span.setAttribute('facts.chars', f.length);
      return f;
    });
  return Sentry.startSpan(
    { op: 'gen_ai.chat', name: `chat ${MODEL_NAME}`, attributes: { 'gen_ai.request.model': MODEL_NAME, 'gen_ai.system': PROVIDER } },
    async (span) => {
      const t0 = Date.now();
      const res = await mastra.getAgent('dharoharGuide').generate(
        `Monument: ${monument}\n\nFacts:\n${facts}\n\nWrite the walking tour script now.`,
      );
      console.log(`llm ${MODEL_INFO} ${Date.now() - t0}ms`);
      span.setAttribute('llm.ms', Date.now() - t0);
      span.setAttribute('gen_ai.usage.input_tokens', res.usage?.inputTokens ?? 0);
      span.setAttribute('gen_ai.usage.output_tokens', res.usage?.outputTokens ?? 0);
      return res.text.trim();
    });
}

const scriptCache = new Map<string, string>(); // ponytail: per-process, cleared on restart
export function generateWalkingTour(monument: string, voice = 'rachel'): Promise<Tour> {
  return Sentry.startSpan(
    { op: 'gen_ai.invoke_agent', name: 'invoke_agent dharohar-guide', attributes: { 'gen_ai.agent.name': 'dharohar-guide', monument, voice } },
    async (span) => {
      let script = scriptCache.get(monument);
      span.setAttribute('cache.hit', !!script);
      if (!script) scriptCache.set(monument, script = await generateScript(monument));
      const audio = await Sentry.startSpan(
        { op: 'gen_ai.execute_tool', name: 'execute_tool generate-audio', attributes: { 'gen_ai.tool.name': 'generate-audio', voice } },
        () => textToAudio(script!, monument, voice)); // audio cached per voice inside
      if (!audio.audioUrl) span.setAttribute('audio.warning', audio.warning || '');
      return { script, ...audio };
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateWalkingTour(process.argv[2] || 'Rajwada, Indore').then(t => console.log(JSON.stringify(t, null, 2)), console.error);
}
