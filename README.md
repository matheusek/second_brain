# second_brain

`second_brain` e um workbench de IA para uso pessoal: um lugar unico para explorar ideias, tomar decisoes e produzir entregas com modelos cloud e local.

## O que ja faz

- chat com dois provedores: Google AI (`gemini`) e Ollama (`qwen` local)
- modos de trabalho: `explore`, `decide`, `build`
- busca web opcional com fontes visiveis na resposta
- historico de conversas salvo no navegador
- passos de execucao exibidos em tempo real durante a resposta
- cancelamento de resposta em andamento

## Stack

- Next.js 15 + React 18 + TypeScript
- rota API em `app/api/chat/route.ts`
- Playwright para testes de interface

## Requisitos

- Node.js 18+
- npm
- opcional: Ollama local para usar `qwen`

## Configuracao

Crie `.env.local` na raiz:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemma-3-27b-it
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b
```

`GEMINI_API_KEY` e obrigatoria para usar o provedor Google AI.

## Rodar localmente

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Abra `http://127.0.0.1:3001`.

## Scripts

- `npm run dev`: desenvolvimento
- `npm run build`: build de producao
- `npm run start`: sobe app buildada
- `npm run serve`: start em `0.0.0.0:3001`
- `npm run test:ui`: testes Playwright

## Estrutura do repositorio

```text
app/       interface e API (App Router)
pages/     arquivos minimos do Pages Router
tests/     testes de interface
docs/      visao de produto, roadmap e backlog
```

## Documentacao

- [Visao](./docs/VISION.md)
- [Roadmap](./docs/ROADMAP.md)
- [Backlog](./docs/BACKLOG.md)
- [Issues](./docs/ISSUES.md)
