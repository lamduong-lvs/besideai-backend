"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { marketingConfig } from "@/config/marketing"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between px-4">
        <MainNav items={marketingConfig.mainNav} />
        <nav className="flex items-center gap-4">
          <ThemeToggle />
          <Button asChild className="hidden md:inline-flex">
            <Link href="/login">Đăng nhập</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

