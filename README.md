# second_brain

Minimal AI workbench for programming and strategy.

## Stack

- Next.js 15
- Google AI (`gemma-3-27b-it`) via `GEMINI_API_KEY`
- Ollama local fallback (`qwen2.5:1.5b`)

## Current features

- Minimal chat UI
- Provider switch: `gemma` or `qwen`
- Mode switch: `code`, `strategy`, `general`
- Step-based execution panel
- `Enter` to send, `Shift+Enter` for newline
- Pause current generation

## Run

```bash
cd /home/matheus/second-brain
npm install
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Open:

- Local: `http://127.0.0.1:3001`
- LAN: `http://192.168.1.11:3001`

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

## Git

```bash
git remote -v
```

Remote:

```text
git@github.com:matheusek/second_brain.git
```
