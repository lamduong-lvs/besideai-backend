"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function Sidebar() {
  const pathname = usePathname();

  const linkClasses = (href: string) =>
    `block rounded-full px-3 py-1.5 text-sm ${
      pathname === href
        ? "bg-black text-white"
        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
    }`;

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:block">
      <div className="mb-6 text-lg font-semibold tracking-tight">BesideAI</div>
      <nav className="space-y-1 text-sm">
        <a href="/account" className={linkClasses("/account")}>
          Account
        </a>
        <a href="/settings" className={linkClasses("/settings")}>
          Settings
        </a>
      </nav>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}


