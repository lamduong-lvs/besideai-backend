import { LucideProps } from "lucide-react"
import dynamic from "next/dynamic"

export const Icons = {
  logo: dynamic(() =>
    import("lucide-react").then((mod) => mod.Sparkles)
  ) as React.ComponentType<LucideProps>,
  sun: dynamic(() =>
    import("lucide-react").then((mod) => mod.Sun)
  ) as React.ComponentType<LucideProps>,
  moon: dynamic(() =>
    import("lucide-react").then((mod) => mod.Moon)
  ) as React.ComponentType<LucideProps>,
  laptop: dynamic(() =>
    import("lucide-react").then((mod) => mod.Laptop)
  ) as React.ComponentType<LucideProps>,
  close: dynamic(() =>
    import("lucide-react").then((mod) => mod.X)
  ) as React.ComponentType<LucideProps>,
  check: dynamic(() =>
    import("lucide-react").then((mod) => mod.Check)
  ) as React.ComponentType<LucideProps>,
}

