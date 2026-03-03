import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("loads the app, switches provider/mode, and sends a message", async ({
  page
}) => {
  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON() as {
      provider?: string;
      mode?: string;
      messages?: Array<{ role: string; content: string }>;
    };

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: {
          role: "assistant",
          content: `mock:${body.provider}:${body.mode}:${body.messages?.at(-1)?.content}`
        },
        meta: {
          provider: body.provider ?? "gemini",
          mode: body.mode ?? "explore",
          model: body.provider === "ollama" ? "qwen2.5:1.5b" : "gemma-3-27b-it"
        }
      })
    });
  });

  await page.goto("/");

  const segmented = page.locator(".segmented");
  const providerToggle = segmented.nth(0);
  const modeToggle = segmented.nth(1);

  await expect(page.locator(".newConversationButton")).toBeVisible();
  await expect(providerToggle.getByRole("button", { name: "gemma" })).toHaveClass(/is-active/);
  await expect(modeToggle.getByRole("button", { name: "explore" })).toHaveClass(/is-active/);

  await providerToggle.getByRole("button", { name: "qwen" }).click();
  await expect(providerToggle.getByRole("button", { name: "qwen" })).toHaveClass(/is-active/);

  await modeToggle.getByRole("button", { name: "decide" }).click();
  await expect(modeToggle.getByRole("button", { name: "decide" })).toHaveClass(/is-active/);

  const input = page.getByLabel("Mensagem");
  await input.fill("teste ui");
  await input.press("Enter");

  await expect(page.getByText("mock:ollama:decide:teste ui")).toBeVisible();
  await expect(page.getByText("estruturando a decisao")).toBeVisible();
});

test("creates and switches conversations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Nova conversa")).toBeVisible();
  await page.locator(".newConversationButton").click();

  const conversationButtons = page.locator(".conversationItem");
  await expect(conversationButtons).toHaveCount(2);
});

test("keeps provider and mode per conversation when switching", async ({ page }) => {
  await page.goto("/");

  const segmented = page.locator(".segmented");
  const providerToggle = segmented.nth(0);
  const modeToggle = segmented.nth(1);
  const conversationButtons = page.locator(".conversationItem");
  const newConversationButton = page.locator(".newConversationButton");

  await providerToggle.getByRole("button", { name: "qwen" }).click();
  await modeToggle.getByRole("button", { name: "decide" }).click();
  await expect(providerToggle.getByRole("button", { name: "qwen" })).toHaveClass(/is-active/);
  await expect(modeToggle.getByRole("button", { name: "decide" })).toHaveClass(/is-active/);

  await newConversationButton.click();
  await expect(conversationButtons).toHaveCount(2);

  await providerToggle.getByRole("button", { name: "gemma" }).click();
  await modeToggle.getByRole("button", { name: "explore" }).click();
  await expect(providerToggle.getByRole("button", { name: "gemma" })).toHaveClass(/is-active/);
  await expect(modeToggle.getByRole("button", { name: "explore" })).toHaveClass(/is-active/);

  await conversationButtons.nth(1).click();
  await expect(providerToggle.getByRole("button", { name: "qwen" })).toHaveClass(/is-active/);
  await expect(modeToggle.getByRole("button", { name: "decide" })).toHaveClass(/is-active/);
});

test("saves memories and sends them with the request", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON() as {
      memories?: Array<{ content: string }>;
    };

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: {
          role: "assistant",
          content: `memories:${body.memories?.length ?? 0}:${body.memories?.[0]?.content ?? ""}`
        },
        meta: {
          provider: "gemini",
          mode: "explore",
          model: "gemma-3-27b-it"
        }
      })
    });
  });

  await page.goto("/");

  await page.getByRole("button", { name: /memorias/i }).click();
  await page.getByLabel("Nova memoria").fill("meu aniversario de namoro com a fernanda e 16 de janeiro");
  await page.getByRole("button", { name: "salvar memoria" }).click();

  await expect(page.locator(".memoryToggle span")).toHaveText("1 memoria ativa");

  const input = page.getByLabel("Mensagem");
  await input.fill("qual data importante voce deve lembrar?");
  await input.press("Enter");

  await expect(
    page.getByText("memories:1:meu aniversario de namoro com a fernanda e 16 de janeiro")
  ).toBeVisible();
});

test("suggests a memory from chat and lets me save it", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: {
          role: "assistant",
          content: "ok"
        },
        meta: {
          provider: "gemini",
          mode: "explore",
          model: "gemma-3-27b-it"
        }
      })
    });
  });

  await page.goto("/");

  const input = page.getByLabel("Mensagem");
  await input.fill("lembre que meu aniversario de namoro com a fernanda e 16 de janeiro");
  await input.press("Enter");

  await expect(page.getByText("sugestao de memoria")).toBeVisible();
  await expect(page.locator(".memorySuggestion__content p")).toHaveText(
    "meu aniversario de namoro com a fernanda e 16 de janeiro"
  );

  await page.getByRole("button", { name: "salvar" }).click();
  await expect(page.locator(".memoryToggle span")).toHaveText("1 memoria ativa");

  await expect(
    page.locator(".memoryItem").getByText("meu aniversario de namoro com a fernanda e 16 de janeiro")
  ).toBeVisible();
});

test("edits an existing memory", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /memorias/i }).click();
  await page.getByLabel("Nova memoria").fill("prefiro respostas longas");
  await page.getByRole("button", { name: "salvar memoria" }).click();

  await page.locator(".memoryItem").getByRole("button", { name: "editar" }).click();
  await page.getByLabel(/Editar memoria/).fill("prefiro respostas curtas e diretas");
  await page.locator(".memoryItem__actions").getByRole("button", { name: "salvar" }).click();

  await expect(page.locator(".memoryItem p")).toHaveText("prefiro respostas curtas e diretas");
});

test("suggests a memory from the model response", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: {
          role: "assistant",
          content: "ok"
        },
        meta: {
          provider: "gemini",
          mode: "explore",
          model: "gemma-3-27b-it",
          memorySuggestion: "o usuario prefere respostas curtas"
        }
      })
    });
  });

  await page.goto("/");

  const input = page.getByLabel("Mensagem");
  await input.fill("me ajude a trabalhar melhor");
  await input.press("Enter");

  await expect(page.getByText("sugestao de memoria")).toBeVisible();
  await expect(page.locator(".memorySuggestion__content p")).toHaveText(
    "o usuario prefere respostas curtas"
  );
});

test("filters the memory list", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /memorias/i }).click();
  await page.getByLabel("Nova memoria").fill("fernanda aniversario em 16 de janeiro");
  await page.getByRole("button", { name: "salvar memoria" }).click();
  await page.getByLabel("Nova memoria").fill("bitcoin analise diaria as 09h");
  await page.getByRole("button", { name: "salvar memoria" }).click();

  await page.getByLabel("Filtrar memorias").fill("bitcoin");

  await expect(page.locator(".memoryItem")).toHaveCount(1);
  await expect(page.locator(".memoryItem p")).toHaveText("bitcoin analise diaria as 09h");
});
