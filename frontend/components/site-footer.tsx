"use client"

import Link from "next/link"
import Image from "next/image"
import { Github, Mail, Twitter } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

const footerLinks = {
  product: [
    { name: "Tính năng", href: "#features" },
    { name: "Bảng giá", href: "/pricing" },
    { name: "Chrome Extension", href: "https://chrome.google.com/webstore" },
  ],
  company: [
    { name: "Về chúng tôi", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Liên hệ", href: "/contact" },
  ],
  legal: [
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
  ],
  resources: [
    { name: "Documentation", href: "/docs" },
    { name: "Support", href: "/support" },
    { name: "API", href: "/api" },
  ],
}

const socialLinks = [
  {
    name: "Twitter",
    href: siteConfig.links.twitter,
    icon: Twitter,
  },
  {
    name: "GitHub",
    href: siteConfig.links.github,
    icon: Github,
  },
  {
    name: "Email",
    href: "mailto:support@besideai.work",
    icon: Mail,
  },
]

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn("border-t bg-background", className)}>
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="BesideAI"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <span className="font-bold">{siteConfig.name}</span>
          </div>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              BesideAI Team
            </a>
            . Hosted on{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              Vercel
            </a>
            . The source code is available on{" "}
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              GitHub
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-4">
          {socialLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label={link.name}
              >
                <Icon className="h-5 w-5" />
              </Link>
            )
          })}
        </div>
      </div>
    </footer>
  )
}

