import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core';
import { createTool } from '@mastra/core/tools';
import { createOllama } from 'ollama-ai-provider-v2';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import 'dotenv/config';

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

// 2. Gemma: Groq if GROQ_API_KEY is set, else local Ollama
const model = process.env.GROQ_API_KEY
  ? createGroq()(process.env.GROQ_MODEL || 'gemma2-9b-it')
  : createOllama({ baseURL: process.env.OLLAMA_URL || 'http://localhost:11434/api' })(process.env.OLLAMA_MODEL || 'gemma3:4b');

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

// 3. fetch context -> generate constrained script.
// Gemma has no native tool-calling in Ollama, so the tool runs first and its output goes into the prompt.
export async function generateWalkingTour(monument: string) {
  const facts = await searchHeritage.execute!({ monument }, {} as any);
  const res = await mastra.getAgent('dharoharGuide').generate(
    `Monument: ${monument}\n\nFacts:\n${facts}\n\nWrite the walking tour script now.`,
  );
  return res.text.trim();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateWalkingTour(process.argv[2] || 'Rajwada, Indore').then(console.log, console.error);
}
