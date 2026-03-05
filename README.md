# second_brain

`second_brain` is a personal AI workbench: one place to explore ideas, make decisions, and produce concrete outputs using cloud and local models.

## Current capabilities

- chat with two providers: Google AI (`gemini`) and Ollama (`qwen` local)
- work modes: `explore`, `decide`, `build`
- optional web search with visible sources in responses
- browser-persisted conversation history
- live execution steps while generating answers
- cancel in-flight responses

## Stack

- Next.js 15 + React 18 + TypeScript
- API route in `app/api/chat/route.ts`
- Playwright for UI tests

## Requirements

- Node.js 18+
- npm
- optional: local Ollama for `qwen`

## Configuration

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemma-3-27b-it
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b
```

`GEMINI_API_KEY` is required to use Google AI.

## Run locally

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Open `http://127.0.0.1:3001`.

## Scripts

- `npm run dev`: development
- `npm run build`: production build
- `npm run start`: run built app
- `npm run serve`: start on `0.0.0.0:3001`
- `npm run test:ui`: Playwright tests

## Repository structure

```text
app/       UI and API (App Router)
pages/     minimal Pages Router files
tests/     UI tests
docs/      product vision, roadmap, and backlog
```

## Documentation

- [Vision](./docs/VISION.md)
- [Roadmap](./docs/ROADMAP.md)
- [Backlog](./docs/BACKLOG.md)
- [Issues](./docs/ISSUES.md)
