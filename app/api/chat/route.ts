import { NextRequest, NextResponse } from "next/server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Provider = "gemini" | "ollama";
type Mode = "explore" | "decide" | "build";
type WebSource = {
  title: string;
  url: string;
  snippet: string;
};

const BASE_PROMPT =
  "Responda em portugues do Brasil por padrao. Seja direto, util e sem frases de atendimento genericas.";
const MODE_PROMPTS: Record<Mode, string> = {
  explore:
    `${BASE_PROMPT} Priorize exploracao, entendimento de contexto, leitura de material, organizacao de ideias, hipoteses, perguntas uteis, lacunas e possibilidades.`,
  decide:
    `${BASE_PROMPT} Priorize estrategia, produto, negocios, priorizacao, analise de trade-offs e planos objetivos. Estruture o raciocinio sem enrolacao.`,
  build:
    `${BASE_PROMPT} Priorize execucao e producao de saida util. Transforme contexto em plano, estrutura, checklist, texto, especificacao ou implementacao concreta.`,
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemma-3-27b-it";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";

function getSystemPrompt(mode: Mode) {
  return MODE_PROMPTS[mode] || MODE_PROMPTS.explore;
}

function decodeHtml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchWeb(query: string): Promise<WebSource[]> {
  const response = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Busca web falhou: ${response.statusText}`);
  }

  const html = await response.text();
  const anchors = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)];
  const snippets = [...html.matchAll(/<a class="result__snippet"[^>]*>(.*?)<\/a>|<div class="result__snippet"[^>]*>(.*?)<\/div>/g)];

  return anchors.slice(0, 5).map((match, index) => ({
    url: decodeHtml(match[1] || ""),
    title: decodeHtml(match[2] || "Fonte"),
    snippet: decodeHtml(snippets[index]?.[1] || snippets[index]?.[2] || "")
  })).filter((source) => source.url && source.title);
}

function withWebContext(systemPrompt: string, sources: WebSource[]) {
  if (sources.length === 0) {
    return systemPrompt;
  }

  const sourceBlock = sources
    .map(
      (source, index) =>
        `${index + 1}. ${source.title}\nURL: ${source.url}\nResumo: ${source.snippet || "Sem resumo"}`
    )
    .join("\n\n");

  return `${systemPrompt}\n\nUse estas fontes web atuais quando forem relevantes:\n\n${sourceBlock}\n\nSe usar a web, sintetize com objetividade e sem inventar detalhes.`;
}

function toGeminiContents(messages: Message[], systemPrompt: string) {
  return messages.map((message, index) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      {
        text:
          index === 0 && message.role === "user"
            ? `${systemPrompt}\n\n${message.content}`
            : message.content
      }
    ]
  }));
}

async function chatWithGemini(messages: Message[], systemPrompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: toGeminiContents(messages, systemPrompt)
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google AI retornou erro: ${text || response.statusText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "Sem resposta do modelo."
  );
}

async function chatWithOllama(messages: Message[], systemPrompt: string) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [{ role: "system", content: systemPrompt }, ...messages]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama retornou erro: ${text || response.statusText}`);
  }

  const data = (await response.json()) as {
    message?: { content?: string };
  };

  return data.message?.content || "Sem resposta do modelo.";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { messages?: Message[]; provider?: Provider; mode?: Mode; useWeb?: boolean }
    | null;
  const messages = body?.messages;
  const requestedProvider = body?.provider || "gemini";
  const mode = body?.mode || "explore";
  const useWeb = body?.useWeb === true;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Envie um array de mensagens." },
      { status: 400 }
    );
  }

  try {
    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const sources = useWeb ? await searchWeb(lastUserMessage) : [];
    const systemPrompt = withWebContext(getSystemPrompt(mode), sources);
    const provider: Provider =
      requestedProvider === "gemini" && GEMINI_API_KEY ? "gemini" : "ollama";
    const model = provider === "gemini" ? GEMINI_MODEL : OLLAMA_MODEL;
    const content =
      provider === "gemini"
        ? await chatWithGemini(messages, systemPrompt)
        : await chatWithOllama(messages, systemPrompt);

    return NextResponse.json({
      message: {
        role: "assistant",
        content
      },
      meta: { provider, mode, model, sources, usedWeb: useWeb }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel conectar ao provedor de IA."
      },
      { status: 500 }
    );
  }
}
