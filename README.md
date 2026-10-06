# Dharohar agent

Audio-first heritage walking tours for Indian cities. A Mastra agent fetches live facts with SerpApi and Gemma writes a short spoken script with physical, real-world cues only. No screen talk: put the phone in your pocket and walk.

- `POST /script {"monument": "Rajwada, Indore"}` → `{"script": "..."}`
- Model: Gemma via Groq when `GROQ_API_KEY` is set, otherwise local Ollama (`gemma3:4b`).
- Evals (`npm test`) fail if a script runs over 100 words, mentions screens/apps/maps, or skips the opening line.

```
cp .env.example .env   # add SERPAPI_KEY
npm install && npm start
```

Front end: https://dharohar-a03.pages.dev
