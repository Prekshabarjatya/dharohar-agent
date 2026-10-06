---
title: "Dharohar: an open-source AI audio guide that makes you put your phone in your pocket 🌿"
tags: hacktoberfest, devchallenge, opensource, ai
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

## What I Built

You're standing in front of Rajwada, a seven-storey Holkar palace that has watched Indore since 1747, and you're staring at a map on a five-inch screen.

**Dharohar** (धरोहर, "heritage") is an audio-first walking guide for India's old city quarters. Pick a walk, and it writes and voices a short spoken tour for every stop. Then a 10-second countdown asks you to put your phone in your pocket, and the screen goes black. You walk. When GPS says you've reached the next monument, the guide starts talking.

The measure of success is how little you look at it.

It's for anyone who lives in or visits a heritage town: today, *Old Indore: Holkar Heart* (Rajwada → Gopal Mandir → Kanch Mandir → Krishnapura Chhatris) and *Mahakal to Ram Ghat* in Ujjain.

How it keeps you off the screen:
- **Black screen, not locked screen.** Phones pause GPS and audio when the screen locks, so Dharohar holds the screen awake (Wake Lock) but paints it pure black. On OLED phones that's almost no battery, and nothing to look at.
- **GPS geofences** play each stop as you arrive, with a short vibration. No tapping.
- **Works with no signal.** Every stop is prepared while you still have network, then a service worker caches the app and the audio, so temple courtyards and narrow lanes don't break the walk.
- **The script itself is screen-free.** The guide is forbidden from saying screen, app, map, click, tap or scroll, and only gives physical cues.

## Demo

- Live: https://dharohar-agent.onrender.com (free tier: the first request after idle takes ~1 minute to wake)
<!-- Embed demo video: landing → countdown → phone into pocket → walking at Rajwada → waypoint vibration -->
<!-- 2-3 photos at Rajwada / Mahakal, phone in pocket, headphones on -->

## Code

{% github Prekshabarjatya/dharohar-agent %}

## How I Built It

**Pipeline per stop (a Mastra agent with two tools):** SerpApi search → Gemma writes the script → ElevenLabs speaks it.

- **Gemma (open-weight)** writes every script: under 100 words, physical cues only, and only facts from the search results. In production it's `gemma-4-26b-a4b-it` via Google AI Studio; on my laptop the same code runs `gemma3:4b` locally through **Ollama**. One env var switches between them (Groq also supported).
- **Mastra** holds the agent, its rules and its tools (`search-heritage`, `generate-audio`).
- **SerpApi** grounds each stop in live search results before Gemma writes a word.
- **ElevenLabs** `eleven_multilingual_v2` voices it, with four voices to choose from.
- **Render** runs the agent and the walk UI as one free Node service, auto-deployed from GitHub.
- **Sentry** traces each tour as an agent run: the search, the Gemma call (with token counts and latency) and the ElevenLabs call, each as a span.

One honest design note: small Gemma models don't do native tool-calling reliably, so instead of asking the model to pick tools, the pipeline calls them in order. Simpler, and it never "forgets" to search.

**Eval-driven.** The "Touch Grass" rules are tests, not hopes. `npm test` runs 10 evals: word limit, banned screen words, the opening line, audio saved, graceful fallback when ElevenLabs fails, caching (same stop twice = one ElevenLabs call), and geofences that fire inside the radius but not 500 m away and never replay. GitHub Actions runs the fast ones on every push.

One eval taught me something. The first version passed every format check while Gemma invented "a carved wooden balcony" and "a stone lion" that don't exist: it had copied the example from its own instructions. Format checks can't catch made-up facts. Grounding with SerpApi plus a "use only features named in the facts" rule fixed it.

**Caching:** each stop's script is cached, and its audio is cached per voice, so the second visitor to Rajwada costs no model call and no ElevenLabs credits.

I built this with an AI coding agent (Claude Code): I set the concept, the rules and the evals; the agent wrote most of the code, ran the tests and fixed failures; I reviewed every change.

## Why Does Open Innovation Matter?

- **Local history belongs to locals.** With an open-weight model, a temple trust, a heritage walk group or a college club can run the guide on its own hardware. The same code ran Gemma on my laptop with no API at all.
- **No lock-in.** Laptop, GPU box, Google AI Studio or Groq: same code, one env var. If a provider changes terms, the walk keeps working. (This happened during the build: an older Gemma version was retired on one provider, and switching took one line.)
- **Open data, open code.** Every tour is grounded in public search results, and the whole project is MIT-style open on GitHub so anyone can add a walk for their own town.
- **What's next:** a "local story" box per stop, so residents can add the oral history that never made it to Wikipedia, read aloud as part of the tour.

## My Agent Session

<!-- DevRelay agent_session embed -->

## Prize Categories

- **Best Use of Gemma**: Gemma writes every grounded, length-capped script (Gemma 4 in production, Gemma 3 locally).
- **Best Use of Render**: the whole app runs as one free Render web service from a `render.yaml` blueprint.
- **Best Use of ElevenLabs**: the guide's voice, four selectable voices, cached per stop.
- **Best Use of SerpApi**: live facts for every stop before Gemma writes.
- **Best Use of Mastra**: agent, rules and tools for the pipeline.
- **Best Use of Sentry Agent Tracing**: tool and LLM spans with tokens and latency (trace screenshot above).
- **Best Use of GitHub Copilot**: GitHub Actions runs the evals on every push.
