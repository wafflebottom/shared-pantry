"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) router.refresh()
    }
    const timer = setInterval(refresh, intervalMs)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [router, intervalMs])

  return null
}
