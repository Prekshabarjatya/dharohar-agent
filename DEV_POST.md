*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

## What I Built

I live in Indore. Ten minutes from my house is Rajwada, a seven-storey palace the Holkars started building in 1747. I have walked past it hundreds of times, usually looking at my phone.

**Dharohar** (धरोहर, *heritage*) is an audio guide for India's old city lanes that tries to get you to stop doing that. You tap **Walk where I am**. It finds the heritage sites around you, writes a short spoken guide for each one, voices it, and then asks you to put your phone in your pocket. The screen goes black. You walk. When GPS says you have reached the next stop, the guide starts talking.

The measure of success is how little you look at it.

It's for anyone in a heritage town who wants the story without the screen: residents who never learned the history of the street they live on, and visitors who don't want to follow a blue dot for an hour.

What keeps you off the screen:

- **Black, not locked.** Phones pause GPS and web audio when the screen locks. So Dharohar keeps the screen awake with the Wake Lock API and paints it pure black. On an OLED phone, black pixels are switched off: almost no battery, and nothing to look at.
- **GPS does the tapping.** Each stop has a geofence. Walk into it, feel a short vibration, hear the story. A stop never repeats.
- **Dead zones are fine.** Every stop is written and voiced before you leave, while you still have signal. A service worker caches the app and every MP3, so a temple courtyard with no network doesn't stop the walk.
- **The guide is forbidden from mentioning screens.** No "on your map", no "tap here". Only things you can see with your own eyes.
- **Your language.** The guide speaks ten Indian languages, from Hindi and Marathi to Tamil and Malayalam.

## Demo

**Live:** https://dharohar-agent.onrender.com. Open it on your phone, allow location, tap **Walk where I am**. (It runs on Render's free tier: the first visit after a quiet spell takes about a minute to wake up, and a brand-new stop takes about a minute to write.)

<!-- VIDEO: vertical demo recorded at Holkar Stadium, Indore -->

In the video I'm standing at Holkar Stadium in Indore, a cricket ground with no heritage of its own. Dharohar looks wider, finds Gajanan Maharaj Temple, Indore Museum, Rajwada, Lalbagh Palace and Kanch Mandir, and orders them into a walk. Then: countdown, black screen, the guide begins. When I reach Rajwada, the phone vibrates and Rajwada's story plays.

You can also type any place. Gwalior Fort gives Chaturbhuj Temple, Gujari Mahal, Sasbahu Temple and the Siddhachal caves, all within 800 metres. Mandu gives Jama Masjid, Lohani Caves, Hindola Mahal and Nilkanth temple.

<!-- PHOTOS: walking the Rajwada stop, phone in pocket -->

## Code

{% github Prekshabarjatya/dharohar-agent %}

## How I Built It

The finished pipeline is small. For each stop, a **Mastra** agent with two tools:

1. **SerpApi** searches the web for the monument, so the guide starts from real facts.
2. **Gemma** writes a script of under 100 words: physical directions only, and only facts from the search.
3. **ElevenLabs** voices it, in the walker's language and one of four voices.

Then the walk page takes over: ordering stops into a route, geofences, wake lock and the offline cache. It got there in six phases.

### Phase 1: Prove the idea

One HTML file. Wikipedia's geosearch found monuments near a point, and the browser's built-in speech read their summaries aloud. It was rough, but it answered the first question: can a page find the history around you and read it aloud? It could.

### Phase 2: A real guide, with rules

I moved to a **Mastra** agent: SerpApi for facts, **Gemma** for the script. On my laptop Gemma 3 4B runs locally through **Ollama**, with no API at all.

Small Gemma models don't do native tool calling reliably, so the pipeline calls the tools in a fixed order instead of hoping the model remembers to search. That's simpler, and it never skips the facts.

This is also where I wrote the "touch grass" rules as tests: under 100 words, open with *"Namaste. Put your phone in your pocket"*, and never say screen, app, map, click, tap or scroll (whole words, so "approach" passes).

**The eval that lied to me.** My first version passed every check while Gemma described "a carved wooden balcony" and "a stone lion" at Rajwada. Neither exists. It had copied the example sentence from its own instructions. Format checks can't catch invented facts. What fixed it was grounding every script in search results, plus a rule to mention only features named in those facts.

### Phase 3: Give it a voice

**ElevenLabs** voices every script. Two things made it practical:

- **Caching.** Each stop's script is cached, and its audio is cached per voice. The second person to walk past Rajwada gets it in under a second, and costs no model call and no ElevenLabs credits.
- **Graceful failure.** If ElevenLabs is down or out of credits, the script still comes back with a warning, and the phone's own voice reads it. The walk never stops.

The evals here use a fake ElevenLabs, so running them costs nothing.

### Phase 4: Make the screen disappear

This is the "touch grass" part, and the hardest UX problem. Phones pause GPS and web audio when the screen locks, which kills a walking guide. So Dharohar keeps the screen awake with the **Wake Lock API** and paints it pure black. On OLED, black pixels are off: almost no battery, and nothing to look at.

On top of that: a **geofence** per stop that plays its story when you arrive (with a short vibration, and never twice), and a **service worker** that caches the app and every MP3 before you leave, so temple courtyards with no signal don't break the walk.

### Phase 5: Ship it, then debug it in public

The agent and the walk page run as one free **Render** web service. Going live taught me more than building did:

- The Gemma version I first deployed had been retired on Google AI Studio. Because the model is open-weight and the code isn't tied to one vendor, I listed what was available and switched to `gemma-4-26b-a4b-it` in one line. Its scripts are noticeably better: Kanch Mandir's names Seth Hukumchand, gives 1903 and points out the glass murals.
- Timing each part showed the search takes 1.4 seconds and Gemma on the free tier about a minute per new stop. That's why caching matters so much.
- The pipeline is instrumented for **Sentry** agent tracing: each tour is one agent run, with spans for the search, the Gemma call (model, tokens, latency) and the voice.
- GitHub Actions runs the fast evals on every push.

### Phase 6: Anywhere, in any language

The first walks were hand-made for Indore and Ujjain. Now you can tap **Walk where I am** or type any place, and Dharohar builds a walk from the nearest heritage on Wikipedia's open geodata. It looks within 2 km first and widens to 10 km if needed, so a cricket stadium or a spread-out site like Mandu still gets a real walk.

And the guide speaks **ten Indian languages**: English, Hindi, Marathi, Gujarati, Bengali, Punjabi, Tamil, Telugu, Kannada and Malayalam. Gemma writes in the language itself, starting from a native opening line ("नमस्कार. तुमचा फोन खिशात ठेवा…" in Marathi). ElevenLabs' multilingual model covers Hindi and Tamil, and the others go to `eleven_v3`; I checked every language's voice against the API before shipping. Hindi and Marathi are tested end to end, script and audio.

All of it is held to **13 evals** (`npm test`).

I built this with an AI coding agent (Claude Code). I set the idea, the rules and the evals. The agent wrote most of the code, ran the tests and fixed what failed, and I reviewed every change. The session is below.

## Why Does Open Innovation Matter?

**Local history belongs to locals.** A temple trust, a heritage walk group or a college club can run Dharohar on its own hardware. I ran the whole thing on my laptop with Gemma through Ollama, with no API key for the model at all.

**Swapping models is one line.** This happened during the build: the Gemma version I first deployed was retired on one provider. Because the model is open-weight and the code doesn't depend on one vendor, I listed what was available and switched to Gemma 4 in one line. With a closed API, that's a rewrite or a shutdown.

**Open data, open code.** Walks come from Wikipedia's open geodata. The guide is grounded in public search results. The code is MIT-licensed, so anyone can add a walk for their own town.

**What's next:** a "local story" box at each stop, so people who live there can add the oral history that never reached Wikipedia, read aloud as part of the walk. That only works if the community can see and change how the guide works. That's what open is for.

## My Agent Session

{% agent_session 575 %}

## Prize Categories

- **Best Use of Gemma**: Gemma writes every grounded, length-capped script (Gemma 4 in production, Gemma 3 locally through Ollama).
- **Best Use of Render**: the agent and the walk UI run as one free Render web service, deployed from a `render.yaml` blueprint.
- **Best Use of ElevenLabs**: the guide's voice in ten Indian languages, four voices, audio cached per stop.
- **Best Use of SerpApi**: live facts for every stop before Gemma writes a word.
- **Best Use of Mastra**: the agent, its rules and its tools.
- **Best Use of GitHub Copilot**: GitHub Actions runs the evals on every push.
