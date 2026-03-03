import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qwen Web",
  description: "Chat web local conectado ao Ollama"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
