# Dharohar agent

Audio-first heritage walking tours for Indian cities. A Mastra agent fetches live facts with SerpApi and Gemma writes a short spoken script with physical, real-world cues only. No screen talk: put the phone in your pocket and walk.

- `POST /script {"monument": "Rajwada, Indore"}` → `{"script": "...", "audioUrl": "/audio/rajwada-indore_<ts>.mp3", "duration": 32}`
- `GET /audio/<file>.mp3` serves the spoken guide (ElevenLabs `eleven_multilingual_v2`, so Hindi works too).
- Audio is cached per monument, so a second visitor costs no ElevenLabs credits. If ElevenLabs fails, the response has `audioUrl: null` and a `warning`, and the script is still returned.
- Model: Gemma via Google AI Studio (`gemma-4-26b-a4b-it`) when `GOOGLE_GENERATIVE_AI_API_KEY` is set, else Groq when `GROQ_API_KEY` is set, else local Ollama (`gemma3:4b`).
- Evals (`npm test`, ElevenLabs mocked, no credits used) check audio, fallback and caching, and fail if a script runs over 100 words, mentions screens/apps/maps, or skips the opening line.

```
cp .env.example .env   # add SERPAPI_KEY and ELEVENLABS_API_KEY
npm install && npm start
```

Front end: https://dharohar-a03.pages.dev

## The black screen

Open `/` and type any place (e.g. "Gwalior Fort"), tap **Walk where I am**, or pick a ready-made walk (Old Indore, Mahakal to Ram Ghat). Any-place walks use the nearest heritage pages on Wikipedia, ordered as a walking route, and Dharohar writes and voices every stop up front. Then a 10-second countdown asks you to pocket the phone, and the screen goes black with one PLAY AUDIO button.

- The screen stays on but black (Wake Lock). Phones pause GPS and audio when the screen locks, so a black screen is how the walk keeps listening while using almost no battery on OLED.
- GPS geofences (`public/walk-core.js`) play each stop when you come within its radius, with a short vibration. A stop never replays.
- No location? Double-tap the black screen for the next stop.
- Pick the guide's voice (Rachel, Adam, Domi, Antoni). Scripts are shared across voices, audio is cached per voice.
- If ElevenLabs is down, the phone's own voice reads the script.
- Installable as a home-screen app (`manifest.json`).

## Offline, tracing, CI, deploy

- **Offline:** `public/sw.js` caches the app and every stop's MP3 once a walk is prepared, so it keeps playing in dead zones.
- **Sentry:** set `SENTRY_DSN`. Each tour is a `gen_ai.invoke_agent` trace with `execute_tool` spans (search-heritage, generate-audio) and a `gen_ai.chat` span with token usage.
- **CI:** `.github/workflows/evals.yml` runs typecheck + geofence evals on every push; full Gemma evals on manual run.
- **DigitalOcean:** `doctl apps create --spec .do/app.yaml` (Dockerfile build); point `OLLAMA_URL` at a 1-Click Ollama GPU Droplet with `ollama pull gemma3:4b`.
- **Render:** `render.yaml` blueprint, with `GROQ_API_KEY` for hosted Gemma.
