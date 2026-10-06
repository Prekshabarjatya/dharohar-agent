# Dharohar agent

Audio-first heritage walking tours for Indian cities. A Mastra agent fetches live facts with SerpApi and Gemma writes a short spoken script with physical, real-world cues only. No screen talk: put the phone in your pocket and walk.

- `POST /script {"monument": "Rajwada, Indore"}` → `{"script": "...", "audioUrl": "/audio/rajwada-indore_<ts>.mp3", "duration": 32}`
- `GET /audio/<file>.mp3` serves the spoken guide (ElevenLabs `eleven_multilingual_v2`, so Hindi works too).
- Audio is cached per monument, so a second visitor costs no ElevenLabs credits. If ElevenLabs fails, the response has `audioUrl: null` and a `warning`, and the script is still returned.
- Model: Gemma via Groq when `GROQ_API_KEY` is set, otherwise local Ollama (`gemma3:4b`).
- Evals (`npm test`, ElevenLabs mocked, no credits used) check audio, fallback and caching, and fail if a script runs over 100 words, mentions screens/apps/maps, or skips the opening line.

```
cp .env.example .env   # add SERPAPI_KEY and ELEVENLABS_API_KEY
npm install && npm start
```

Front end: https://dharohar-a03.pages.dev

## The black screen

Open `/`, pick a walk (Old Indore or Mahakal to Ram Ghat), and Dharohar writes and voices every stop up front. Then a 10-second countdown asks you to pocket the phone, and the screen goes black with one PLAY AUDIO button.

- The screen stays on but black (Wake Lock). Phones pause GPS and audio when the screen locks, so a black screen is how the walk keeps listening while using almost no battery on OLED.
- GPS geofences (`public/walk-core.js`) play each stop when you come within its radius, with a short vibration. A stop never replays.
- No location? Double-tap the black screen for the next stop.
- If ElevenLabs is down, the phone's own voice reads the script.
- Installable as a home-screen app (`manifest.json`).
