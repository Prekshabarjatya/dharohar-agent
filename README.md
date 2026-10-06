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
