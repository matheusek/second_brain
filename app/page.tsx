"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Provider = "gemini" | "ollama";
type Mode = "code" | "strategy" | "general";
type StepStatus = "pending" | "running" | "done" | "paused";
type Step = {
  title: string;
  detail: string;
  status: StepStatus;
};

const initialMessage: Message = {
  role: "assistant",
  content: "Pronto."
};

function buildSteps(mode: Mode, provider: Provider): Step[] {
  const providerLabel = provider === "gemini" ? "Gemma" : "Qwen local";

  if (mode === "code") {
    return [
      {
        title: "entendendo a tarefa",
        detail: `Lendo o pedido e separando contexto, objetivo tecnico e restricoes para ${providerLabel}.`,
        status: "running"
      },
      {
        title: "planejando a abordagem",
        detail: "Definindo passos, trade-offs tecnicos e formato de resposta mais util.",
        status: "pending"
      },
      {
        title: "gerando a resposta",
        detail: "Montando a solucao com foco em codigo, arquitetura ou debug.",
        status: "pending"
      }
    ];
  }

  if (mode === "strategy") {
    return [
      {
        title: "estruturando o contexto",
        detail: `Separando problema, objetivo e restricoes para consulta com ${providerLabel}.`,
        status: "running"
      },
      {
        title: "avaliando opcoes",
        detail: "Comparando caminhos, riscos, custo de execucao e impacto.",
        status: "pending"
      },
      {
        title: "consolidando recomendacao",
        detail: "Transformando a analise em direcao pratica e priorizada.",
        status: "pending"
      }
    ];
  }

  return [
    {
      title: "entendendo o pedido",
      detail: `Organizando a entrada antes de enviar para ${providerLabel}.`,
      status: "running"
    },
    {
      title: "processando",
      detail: "Executando a consulta e condensando o que importa.",
      status: "pending"
    },
    {
      title: "finalizando",
      detail: "Preparando a resposta final de forma objetiva.",
      status: "pending"
    }
  ];
}

function advanceSteps(current: Step[]): Step[] {
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
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [provider, setProvider] = useState<Provider>("gemini");
  const [mode, setMode] = useState<Mode>("code");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!loading || steps.length === 0) return;

    const timer = window.setInterval(() => {
      setSteps((current) => advanceSteps(current));
    }, 1400);

    return () => window.clearInterval(timer);
  }, [loading, steps.length]);

  function finalizeSteps() {
    setSteps((current) =>
      current.map((step, index, all) => ({
        ...step,
        status: index === all.length - 1 ? "done" : step.status === "pending" ? "done" : step.status
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

  function onPause() {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError("geracao pausada");
    pauseSteps();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: prompt }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    setSteps(buildSteps(mode, provider));
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
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Falha ao falar com a API.");
      }

      const data = (await response.json()) as {
        message: Message;
        meta?: { provider?: Provider; mode?: Mode; model?: string };
      };
      if (data.meta?.provider) {
        setProvider(data.meta.provider);
      }
      setMessages((current) => [...current, data.message]);
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
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  }

  return (
    <main className="shell">
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
                onClick={() => setProvider("gemini")}
                type="button"
              >
                gemma
              </button>
              <button
                className={provider === "ollama" ? "is-active" : ""}
                onClick={() => setProvider("ollama")}
                type="button"
              >
                qwen
              </button>
            </div>

            <div className="segmented">
              <button
                className={mode === "code" ? "is-active" : ""}
                onClick={() => setMode("code")}
                type="button"
              >
                code
              </button>
              <button
                className={mode === "strategy" ? "is-active" : ""}
                onClick={() => setMode("strategy")}
                type="button"
              >
                strategy
              </button>
              <button
                className={mode === "general" ? "is-active" : ""}
                onClick={() => setMode("general")}
                type="button"
              >
                general
              </button>
            </div>
          </div>

          <div className="status">
            <span className={loading ? "dot dot--busy" : "dot"} />
            {loading ? "respondendo" : "online"}
          </div>
        </header>

        <div className="messages" ref={scrollerRef}>
          {messages.map((message, index) => (
            <article
              className={`bubble bubble--${message.role}`}
              key={`${message.role}-${index}`}
            >
              <span className="bubble__role">{message.role === "assistant" ? "ai" : "you"}</span>
              <p>{message.content}</p>
            </article>
          ))}

          {loading && steps.length > 0 ? (
            <section className="stepsCard" aria-label="Etapas em andamento">
              <span className="bubble__role">run</span>
              <div className="steps">
                {steps.map((step, index) => (
                  <details
                    className={`step step--${step.status}`}
                    key={`${step.title}-${index}`}
                    open={step.status === "running"}
                  >
                    <summary>
                      <span className={`stepDot stepDot--${step.status}`} />
                      <span>{step.title}</span>
                      <span className="stepStatus">{step.status}</span>
                    </summary>
                    <p>{step.detail}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="prompt">
            Mensagem
          </label>
          <textarea
            id="prompt"
            rows={3}
            placeholder={
              mode === "code"
                ? "Cole codigo, bug, arquitetura ou tarefa"
                : mode === "strategy"
                  ? "Descreva o problema, contexto e objetivo"
                  : "Pergunte qualquer coisa"
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onInputKeyDown}
          />

          <div className="composer__footer">
            <p>{error || "enter envia"}</p>
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
