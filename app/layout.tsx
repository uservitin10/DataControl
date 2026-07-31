import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Horús - Portal de Gestão de Documentos",
  description: "Portal interno de gestão de documentos e usuários",
  keywords: ["Horús", "dashboard", "Sql", "documentos", "admin"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gov-background text-gov-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
