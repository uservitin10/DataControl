import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horús - Portal de Gestão de Documentos",
  description: "Portal interno de gestão de documentos e usuários",
  keywords: ["Horús", "dashboard", "Supabase", "documentos", "admin"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gov-background text-gov-text">{children}</body>
    </html>
  );
}
