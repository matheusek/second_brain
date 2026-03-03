# second_brain

Minimal AI workbench for programming, analysis, and strategy.

## What it does

- chat with multiple providers
- switch between `explore`, `decide`, and `build`
- use `gemma` or local `qwen`
- show live step states while answering
- pause an in-flight response
- keep separate conversations in the browser
- optionally use web search with visible sources

## Stack

- Next.js 15
- Google AI via `GEMINI_API_KEY`
- Ollama local fallback
- Playwright for UI tests
- user-level `systemd` service for production

## Providers

- `gemma`: Google AI, default model `gemma-3-27b-it`
- `qwen`: Ollama local, default model `qwen2.5:1.5b`

## Local development

```bash
cd /home/matheus/second-brain
npm install
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Open:

- local: `http://127.0.0.1:3001`
- LAN: `http://192.168.1.11:3001`

## Production

Build:

```bash
cd /home/matheus/second-brain
npm run build
```

Service:

```bash
systemctl --user status second-brain
systemctl --user restart second-brain
systemctl --user stop second-brain
```

## Tests

```bash
cd /home/matheus/second-brain
npm run test:ui
```

## Environment

Create `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
```

Optional:

```bash
GEMINI_MODEL=gemma-3-27b-it
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b
```

## Repo layout

```text
app/                 Next.js app router UI and API route
pages/               minimal pages-router files for stable production builds
tests/               Playwright UI tests
docs/                product docs and backlog
```

## Docs

- [Vision](/home/matheus/second-brain/docs/VISION.md)
- [Roadmap](/home/matheus/second-brain/docs/ROADMAP.md)
- [Backlog](/home/matheus/second-brain/docs/BACKLOG.md)
- [Issues](/home/matheus/second-brain/docs/ISSUES.md)

## Remote

```text
git@github.com:matheusek/second_brain.git
```
