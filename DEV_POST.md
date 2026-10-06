---
title: "Dharohar: an open-source AI audio guide that makes you put your phone in your pocket 🌿"
tags: hf26challenge, devchallenge, opensource, ai
---

## The problem with AI travel apps

You're standing in front of Rajwada, a seven-storey Holkar palace that has watched Indore for almost 300 years, and you're staring at a map on a five-inch screen.

Most AI travel apps keep you looking down. In India's busy, loud, beautiful old quarters, looking down means missing the heritage you came for.

**Dharohar** (धरोहर, "heritage") is an audio-first walking guide. It writes a short spoken tour for each monument on a route, voices it, and then asks you to put your phone away. The screen goes black. You walk. When you reach the next stop, it starts talking.

The measure of success is how little you look at it.

## See it in action

<!-- Embed demo video -->
<!-- 2-3 photos: you at Rajwada / Mahakal, phone in pocket, headphones on -->

**The flow**

1. Pick a walk: *Old Indore: Holkar Heart* (Rajwada → Gopal Mandir → Kanch Mandir → Krishnapura Chhatris) or *Mahakal to Ram Ghat* in Ujjain. Pick the guide's voice.
2. For each stop, a Mastra pipeline fetches live facts with **SerpApi**.
3. **Gemma** writes a spoken script under 100 words, using only physical cues and only the facts it was given.
4. **ElevenLabs** voices it (multilingual model, four voices to choose from).
5. A 10-second countdown: *"Put your phone in your pocket."*
6. **Black screen.** One PLAY AUDIO button. You walk.
7. GPS geofences play the next stop as you arrive, with a short vibration.

## Works with no signal

Old city lanes and temple courtyards often have bad network. Dharohar prepares every stop up front while you still have signal, then a service worker caches the app and each stop's MP3. Walk into a dead zone and the guide keeps talking.

## Why the screen is black, not off

Phones pause GPS and web audio when the screen locks. So Dharohar keeps the screen awake with the Wake Lock API but paints it pure black. On an OLED phone, black pixels are off, so it costs almost no battery, and there is nothing to look at.

## Built with open models at the core

- **Gemma 3 (4B)** through Ollama writes every script. The same code switches to a hosted Gemma through Groq with one env var.
- **Mastra** holds the agent, its instructions and its two tools (`search-heritage`, `generate-audio`).
- **SerpApi** grounds every script in live search results, so Gemma does not have to invent history.
- **ElevenLabs** `eleven_multilingual_v2` gives the guide a voice, and can speak Hindi.
- **DigitalOcean**: App Platform runs the agent and walk UI from the repo's Dockerfile (`.do/app.yaml`); Gemma runs on a 1-Click Ollama GPU Droplet. <!-- keep only once deployed; else swap to Render -->
- **Sentry** traces every tour as an agent run: SerpApi call, Gemma call (model, input/output tokens) and ElevenLabs call, each as its own span.

One honest note on the architecture: small Gemma models don't do native tool-calling in Ollama, so instead of asking the model to call tools, the pipeline calls them in order (search → write → speak). It's simpler and more reliable than hoping a 4B model picks the right tool.

## Why open models matter here

- **Local history belongs to locals.** With an open-weight model, a community can run the guide on its own hardware and, later, add its own oral histories to the context without asking a vendor's permission.
- **Cost control.** Script generation runs on a model we host, and scripts and audio are cached per monument and voice, so the hundredth visitor to Rajwada costs nothing extra.
- **No lock-in.** Gemma on a laptop, on a GPU box or through any provider: it's the same code.

## Eval-driven development

The "Touch Grass" rules are tests, not hopes. `npm test` runs 10 evals:

- Every script is under 100 words, starts with *"Namaste. Put your phone in your pocket"*, and never says screen, app, map, click, tap or scroll (whole words, so "approach" is fine).
- A real MP3 is written for each stop, and its duration is sensible.
- If ElevenLabs fails, the walk still works: text comes back with a warning and the phone's own voice reads it.
- The same monument twice costs one ElevenLabs call. A new voice reuses the script.
- Geofences fire inside the radius, not 500 m away, and never replay a stop.

The ElevenLabs tests use a fake ElevenLabs, so running them costs no credits. GitHub Actions runs the typecheck and geofence evals on every push, and the full Gemma evals (Ollama installed in CI) on demand.

One eval taught me something: the first version passed every format check while Gemma happily invented "a carved wooden balcony" and "a stone lion" that don't exist. It had copied the example from its own instructions. Format evals don't catch made-up facts. Grounding with SerpApi plus a "use only features named in the facts" rule did.

## Watching the agent with Sentry

<!-- screenshot: Sentry AI Agents view / trace waterfall for one tour -->

Each tour is one `invoke_agent dharohar-guide` trace with three child spans: `execute_tool search-heritage`, `chat gemma3:4b` (with token counts), and `execute_tool generate-audio`. The first trace showed the problem straight away: <!-- fill in what you saw, e.g. Gemma on a laptop took ~90 s per stop while SerpApi and ElevenLabs took ~1-3 s, which is why scripts and audio are now cached and the GPU Droplet matters -->.

## How I built it

I built Dharohar with an AI coding agent (Claude Code). I wrote the concept, the "Touch Grass" rules and the evals I wanted; the agent wrote most of the code, ran the tests and fixed failures, and I reviewed each change. The agent sessions are shared here: <!-- Entire link -->

## Sponsor tracks

- **Gemma**: writes every tour script, grounded and length-capped.
- **ElevenLabs**: the guide's voice, four selectable voices, cached per stop.
- **SerpApi**: live facts for every stop before Gemma writes a word.
- **Mastra**: agent, instructions and tools for the pipeline.
- **DigitalOcean**: App Platform for the app, GPU Droplet for Gemma. <!-- only if deployed there -->
- **Sentry**: agent tracing with tool and token spans, screenshots above.
- **GitHub**: Actions runs the evals on every push.
- **Entire**: agent sessions behind the build, linked above.

## Try it

- Live: <!-- DigitalOcean / Render URL -->
- Code: <!-- https://github.com/Prekshabarjatya/dharohar-agent -->
- Video: <!-- link -->

## What's next

- Hindi scripts end to end (the voice already speaks Hindi).
- A "local story" box per stop, stored in MongoDB Atlas, read aloud as part of the tour.
- Walks for more Indore and Ujjain neighbourhoods, contributed by people who live there.
