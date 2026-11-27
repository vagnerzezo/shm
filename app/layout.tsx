import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { InstallPromptCatcher } from "./_components/install-banner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Studio Heitor Macks",
  description: "Agendamento online do Studio Heitor Macks",
  // App instalado no iPhone: nome embaixo do ícone e barra de cima escura.
  appleWebApp: { capable: true, title: "SHM", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  // Deixa a página ir até a borda no iPhone; as barras fixas usam env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <InstallPromptCatcher />
      </body>
    </html>
  );
}
