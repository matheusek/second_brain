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
