import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "입사지원 현황 대시보드 + 채용공고 수집",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
            <span className="font-semibold">Job Tracker</span>
            <Link href="/" className="text-sm hover:underline">
              지원현황
            </Link>
            <Link href="/jobs" className="text-sm hover:underline">
              채용공고
            </Link>
            <Link href="/jobs/archive" className="text-sm hover:underline">
              보관함
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
