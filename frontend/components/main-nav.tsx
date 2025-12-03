"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

import { MainNavItem } from "@/types"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { MobileNav } from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface MainNavProps {
  items?: MainNavItem[]
  children?: React.ReactNode
}

export function MainNav({ items, children }: MainNavProps) {
  const pathname = usePathname()
  const [showMobileMenu, setShowMobileMenu] = React.useState<boolean>(false)

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        <Image
          src="/logo.png"
          alt="BesideAI"
          width={24}
          height={24}
          className="h-6 w-6"
        />
        <span className="hidden font-bold sm:inline-block text-lg">
          {siteConfig.name}
        </span>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items?.map((item, index) => (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center text-sm font-medium transition-colors",
                item.href.startsWith("/") && pathname === item.href
                  ? "text-primary font-semibold"
                  : "text-foreground/60 hover:text-primary",
                item.disabled && "cursor-not-allowed opacity-80"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      ) : null}
      <Button
        variant="ghost"
        className="flex items-center space-x-2 md:hidden"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        <Menu className="h-5 w-5" />
        <span className="font-bold">Menu</span>
      </Button>
      {showMobileMenu && items && (
        <MobileNav items={items} setShowMobileMenu={setShowMobileMenu}>
          {children}
        </MobileNav>
      )}
    </div>
  )
}

