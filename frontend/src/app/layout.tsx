import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "«Отклик» — Платформа доверительных обращений",
  description: "Анонимный безопасный сервис доверительных обращений для школьников, родителей и педагогов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
