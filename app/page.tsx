"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Provider = "gemini" | "ollama";
type Mode = "explore" | "decide" | "build";
type StepStatus = "pending" | "running" | "done" | "paused";
type Step = {
  title: string;
  detail: string;
  status: StepStatus;
};

type ConversationSnapshot = {
  id: string;
  messages: Message[];
  provider: Provider;
  mode: Mode;
  updatedAt: string;
};

const CONVERSATIONS_KEY = "second-brain.conversations";
const ACTIVE_CONVERSATION_KEY = "second-brain.active-conversation";

const initialMessage: Message = {
  role: "assistant",
  content: "Pronto."
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createConversation(
  provider: Provider = "gemini",
  mode: Mode = "explore"
): ConversationSnapshot {
  return {
    id: createId("conv"),
    messages: [initialMessage],
    provider,
    mode,
    updatedAt: new Date().toISOString()
  };
}

function conversationTitle(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content?.trim();
  if (!firstUserMessage) return "Nova conversa";
  return firstUserMessage.length > 42
    ? `${firstUserMessage.slice(0, 42).trimEnd()}...`
    : firstUserMessage;
}

function summarizePrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (!compact) return "sem resumo";
  return compact.length > 72 ? `${compact.slice(0, 72).trimEnd()}...` : compact;
}

function buildSteps(
  mode: Mode,
  provider: Provider,
  prompt: string,
  messageCount: number
): Step[] {
  const providerLabel = provider === "gemini" ? "Gemma" : "Qwen local";
  const contextLabel =
    messageCount > 2 ? `usando ${messageCount - 1} mensagens desta conversa` : "sem contexto anterior";
  const promptLabel = summarizePrompt(prompt);

  if (mode === "explore") {
    return [
      {
        title: "analisando o pedido",
        detail: `${providerLabel} em modo explore · ${contextLabel} · foco: ${promptLabel}`,
        status: "running"
      },
      {
        title: "levantando possibilidades",
        detail: "Mapeando hipoteses, lacunas e pontos que merecem investigacao.",
        status: "pending"
      },
      {
        title: "organizando a leitura",
        detail: "Convertendo a exploracao em uma resposta clara e util para seguir.",
        status: "pending"
      }
    ];
  }

  if (mode === "decide") {
    return [
      {
        title: "estruturando a decisao",
        detail: `${providerLabel} em modo decide · ${contextLabel} · alvo: ${promptLabel}`,
        status: "running"
      },
      {
        title: "comparando caminhos",
        detail: "Pesando trade-offs, risco, esforco e impacto de cada direcao.",
        status: "pending"
      },
      {
        title: "fechando recomendacao",
        detail: "Transformando a analise em direcao pratica e priorizada.",
        status: "pending"
      }
    ];
  }

  return [
    {
      title: "extraindo o objetivo",
      detail: `${providerLabel} em modo build · ${contextLabel} · entrega: ${promptLabel}`,
      status: "running"
    },
    {
      title: "montando a estrutura",
      detail: "Transformando a ideia em uma saida concreta e utilizavel.",
      status: "pending"
    },
    {
      title: "refinando a entrega",
      detail: "Ajustando o resultado final para ficar objetivo e pratico.",
      status: "pending"
    }
  ];
}

function advanceSteps(current: Step[]) {
  const next = current.map((step) => ({ ...step }));
  const runningIndex = next.findIndex((step) => step.status === "running");

  if (runningIndex === -1) {
    const pendingIndex = next.findIndex((step) => step.status === "pending");
    if (pendingIndex !== -1) {
      next[pendingIndex].status = "running";
    }
    return next;
  }

  next[runningIndex].status = "done";
  const nextPending = next.findIndex(
    (step, index) => index > runningIndex && step.status === "pending"
  );

  if (nextPending !== -1) {
    next[nextPending].status = "running";
  } else {
    next[runningIndex].status = "running";
  }

  return next;
}

export default function HomePage() {
  const [conversations, setConversations] = useState<ConversationSnapshot[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [visibleSteps, setVisibleSteps] = useState<Step[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  const currentConversationId = activeConversationId || conversations[0]?.id || "";
  const activeConversation =
    conversations.find((conversation) => conversation.id === currentConversationId) ||
    conversations[0] ||
    null;
  const messages = activeConversation?.messages || [initialMessage];
  const provider = activeConversation?.provider || "gemini";
  const mode = activeConversation?.mode || "explore";

  useEffect(() => {
    try {
      const rawConversations = window.localStorage.getItem(CONVERSATIONS_KEY);
      const rawActiveId = window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);

      if (!rawConversations) {
        const initialConversation = createConversation();
        setConversations([initialConversation]);
        setActiveConversationId(initialConversation.id);
      } else {
        const parsed = JSON.parse(rawConversations) as Partial<ConversationSnapshot>[];
        const restored = Array.isArray(parsed)
          ? parsed
              .map((conversation) => {
                const restoredMessages = Array.isArray(conversation.messages)
                  ? conversation.messages.filter(
                      (message): message is Message =>
                        !!message &&
                        (message.role === "user" || message.role === "assistant") &&
                        typeof message.content === "string"
                    )
                  : [];

                const restoredProvider =
                  conversation.provider === "gemini" || conversation.provider === "ollama"
                    ? conversation.provider
                    : "gemini";
                const restoredMode =
                  conversation.mode === "explore" ||
                  conversation.mode === "decide" ||
                  conversation.mode === "build"
                    ? conversation.mode
                    : "explore";

                if (!conversation.id || restoredMessages.length === 0) {
                  return null;
                }

                return {
                  id: conversation.id,
                  messages: restoredMessages,
                  provider: restoredProvider,
                  mode: restoredMode,
                  updatedAt: conversation.updatedAt || new Date().toISOString()
                };
              })
              .filter((conversation): conversation is ConversationSnapshot => !!conversation)
          : [];

        if (restored.length === 0) {
          const initialConversation = createConversation();
          setConversations([initialConversation]);
          setActiveConversationId(initialConversation.id);
        } else {
          setConversations(restored);
          setActiveConversationId(
            restored.some((conversation) => conversation.id === rawActiveId)
              ? (rawActiveId as string)
              : restored[0].id
          );
        }
      }
    } catch {
      window.localStorage.removeItem(CONVERSATIONS_KEY);
      window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
      const initialConversation = createConversation();
      setConversations([initialConversation]);
      setActiveConversationId(initialConversation.id);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeConversationId);
  }, [activeConversationId, conversations, hydrated]);

  useEffect(() => {
    if (!hydrated || conversations.length === 0) return;
    if (!activeConversationId || !conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, hydrated]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, visibleSteps]);

  useEffect(() => {
    if (!loading || steps.length === 0) return;
    const timer = window.setInterval(() => {
      setSteps((current) => advanceSteps(current));
    }, 1400);

    return () => window.clearInterval(timer);
  }, [loading, steps.length]);

  useEffect(() => {
    if (steps.length > 0) {
      setVisibleSteps(steps);
    }
  }, [steps]);

  useEffect(() => {
    if (loading || steps.length > 0 || visibleSteps.length === 0) return;
    const timer = window.setTimeout(() => {
      setVisibleSteps([]);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [loading, steps.length, visibleSteps.length]);

  function finalizeSteps() {
    setSteps((current) =>
      current.map((step) => ({
        ...step,
        status: step.status === "paused" ? "paused" : "done"
      }))
    );
  }

  function pauseSteps() {
    setSteps((current) =>
      current.map((step) => ({
        ...step,
        status: step.status === "running" ? "paused" : step.status
      }))
    );
  }

  function updateActiveConversation(
    updater: (conversation: ConversationSnapshot) => ConversationSnapshot
  ) {
    if (!currentConversationId) return;

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === currentConversationId ? updater(conversation) : conversation
      )
    );
  }

  function onPause() {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError("geracao pausada");
    pauseSteps();
  }

  function onNewConversation() {
    if (loading) return;
    const nextConversation = createConversation(provider, mode);
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setInput("");
    setError("");
    setSteps([]);
  }

  function onSelectConversation(id: string) {
    if (loading || id === activeConversationId) return;
    setActiveConversationId(id);
    setInput("");
    setError("");
    setSteps([]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();

    if (!prompt || loading || !activeConversation) return;

    const nextMessages = [...messages, { role: "user" as const, content: prompt }];
    updateActiveConversation((conversation) => ({
      ...conversation,
      messages: nextMessages,
      updatedAt: new Date().toISOString()
    }));
    setInput("");
    setError("");
    setLoading(true);
    setSteps(buildSteps(mode, provider, prompt, messages.length));
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, provider, mode }),
        signal: controller.signal
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Falha ao falar com a API.");
      }

      const data = (await response.json()) as {
        message: Message;
        meta?: { provider?: Provider; mode?: Mode };
      };

      updateActiveConversation((conversation) => ({
        ...conversation,
        provider: data.meta?.provider || conversation.provider,
        mode: data.meta?.mode || conversation.mode,
        messages: [...conversation.messages, data.message],
        updatedAt: new Date().toISOString()
      }));
      finalizeSteps();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        pauseSteps();
      } else {
        setError(err instanceof Error ? err.message : "Erro inesperado.");
        setSteps([]);
      }
    } finally {
      requestRef.current = null;
      setLoading(false);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <button className="newConversationButton" onClick={onNewConversation} type="button">
          nova conversa
        </button>

        <div className="conversationList" role="list" aria-label="Conversas">
          {conversations.map((conversation) => (
            <button
              className={
                conversation.id === currentConversationId
                  ? "conversationItem is-active"
                  : "conversationItem"
              }
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              type="button"
            >
              <strong>{conversationTitle(conversation.messages)}</strong>
              <span>
                {conversation.provider === "gemini" ? "gemma" : "qwen"} · {conversation.mode}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar__left">
            <h1>{provider === "gemini" ? "gemma-3-27b-it" : "qwen2.5:1.5b"}</h1>
            <span className="metaText">
              {provider === "gemini" ? "google ai" : "local ollama"} · {mode}
            </span>
          </div>

          <div className="controls" role="group" aria-label="Configuracoes">
            <div className="segmented">
              <button
                className={provider === "gemini" ? "is-active" : ""}
                onClick={() =>
                  updateActiveConversation((conversation) => ({
                    ...conversation,
                    provider: "gemini",
                    updatedAt: new Date().toISOString()
                  }))
                }
                type="button"
              >
                gemma
              </button>
              <button
                className={provider === "ollama" ? "is-active" : ""}
                onClick={() =>
                  updateActiveConversation((conversation) => ({
                    ...conversation,
                    provider: "ollama",
                    updatedAt: new Date().toISOString()
                  }))
                }
                type="button"
              >
                qwen
              </button>
            </div>

            <div className="segmented">
              <button
                className={mode === "explore" ? "is-active" : ""}
                onClick={() =>
                  updateActiveConversation((conversation) => ({
                    ...conversation,
                    mode: "explore",
                    updatedAt: new Date().toISOString()
                  }))
                }
                type="button"
              >
                explore
              </button>
              <button
                className={mode === "decide" ? "is-active" : ""}
                onClick={() =>
                  updateActiveConversation((conversation) => ({
                    ...conversation,
                    mode: "decide",
                    updatedAt: new Date().toISOString()
                  }))
                }
                type="button"
              >
                decide
              </button>
              <button
                className={mode === "build" ? "is-active" : ""}
                onClick={() =>
                  updateActiveConversation((conversation) => ({
                    ...conversation,
                    mode: "build",
                    updatedAt: new Date().toISOString()
                  }))
                }
                type="button"
              >
                build
              </button>
            </div>

            <div className="status" aria-live="polite">
              <span className={loading ? "dot dot--busy" : "dot"} />
              {loading ? "processando" : "pronto"}
            </div>
          </div>
        </header>

        <div className="messages" ref={scrollerRef}>
          {visibleSteps.length > 0 ? (
            <section className="stepsCard" aria-live="polite">
              <div className="stepsCard__header">
                <strong>thinking</strong>
                <span className="stepsCard__status">{loading ? "em andamento" : "concluido"}</span>
              </div>
              <div className="steps">
                {visibleSteps.map((step, index) => (
                  <details
                    className={`step step--${step.status}`}
                    key={`${step.title}-${index}`}
                    open={step.status === "running"}
                  >
                    <summary>
                      <span className={`stepDot stepDot--${step.status}`} />
                      <strong>{step.title}</strong>
                      <span className="stepStatus">{step.status}</span>
                    </summary>
                    <p>{step.detail}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {messages.map((message, index) => (
            <article
              className={
                message.role === "assistant" ? "bubble bubble--assistant" : "bubble bubble--user"
              }
              key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
            >
              <span className="bubble__role">{message.role === "assistant" ? "assistant" : "user"}</span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="prompt">
            Mensagem
          </label>
          <textarea
            id="prompt"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="escreva o que voce quer explorar, decidir ou construir"
            rows={4}
            value={input}
          />

          <div className="composer__footer">
            <div className="composer__meta">{error ? <p>{error}</p> : null}</div>

            <div className="composer__actions">
              {loading ? (
                <button className="secondaryButton" onClick={onPause} type="button">
                  pausar
                </button>
              ) : null}
              <button disabled={loading || !input.trim()} type="submit">
                enviar
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
