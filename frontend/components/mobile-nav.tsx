"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"

import { MainNavItem } from "@/types"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface MobileNavProps {
  items: MainNavItem[]
  setShowMobileMenu: (show: boolean) => void
  children?: React.ReactNode
}

export function MobileNav({
  items,
  setShowMobileMenu,
  children,
}: MobileNavProps) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div className="fixed inset-0 top-16 z-50 grid h-[calc(100vh-4rem)] grid-flow-row auto-rows-max overflow-auto bg-background p-6 pb-32 shadow-md animate-in slide-in-from-bottom-80 md:hidden">
      <div className="relative z-20 grid gap-6 rounded-md bg-popover p-4 text-popover-foreground shadow-md">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2"
            onClick={() => setShowMobileMenu(false)}
          >
            <Image
              src="/logo.png"
              alt="BesideAI"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <span className="font-bold">{siteConfig.name}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="grid grid-flow-row auto-rows-max text-sm">
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                "flex w-full items-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                item.disabled && "cursor-not-allowed opacity-60"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  )
}

