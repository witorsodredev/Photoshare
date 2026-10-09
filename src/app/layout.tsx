import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhotoShare — portfólios e álbuns profissionais",
  description:
    "Faça upload das suas fotos em resolução original, monte álbuns e compartilhe um link para o cliente visualizar e baixar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
