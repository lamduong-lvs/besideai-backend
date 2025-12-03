import "../globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-white/70 backdrop-blur dark:bg-black/70">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-lg font-semibold tracking-tight">
                  BesideAI
                </span>
              </Link>
              <nav className="flex items-center gap-4 text-sm font-medium">
                <a href="#features" className="hover:underline">
                  Tính năng
                </a>
                <Link href="/pricing" className="hover:underline">
                  Bảng giá
                </Link>
                <Link href="/terms" className="hover:underline">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:underline">
                  Privacy
                </Link>
                <Link
                  href="/login"
                  className="rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Đăng nhập
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t bg-white/70 py-4 text-center text-xs text-zinc-500 dark:bg-black/70">
            © {new Date().getFullYear()} BesideAI. All rights reserved.
          </footer>
        </div>
      </body>
    </html>
  );
}


