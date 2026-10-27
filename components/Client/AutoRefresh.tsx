"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export default function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()
  const lastRefreshAt = useRef(0)
  const pendingRefresh = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) {
        lastRefreshAt.current = Date.now()
        router.refresh()
      }
    }
    // Focus/visibility fires often double up with the interval tick, so
    // they wait briefly and are skipped when the tick just refreshed.
    const scheduleRefresh = () => {
      if (pendingRefresh.current) return
      pendingRefresh.current = setTimeout(() => {
        pendingRefresh.current = null
        if (Date.now() - lastRefreshAt.current > 1000) refresh()
      }, 300)
    }
    const timer = setInterval(() => {
      if (pendingRefresh.current) {
        clearTimeout(pendingRefresh.current)
        pendingRefresh.current = null
      }
      refresh()
    }, intervalMs)
    window.addEventListener("focus", scheduleRefresh)
    document.addEventListener("visibilitychange", scheduleRefresh)
    return () => {
      clearInterval(timer)
      if (pendingRefresh.current) clearTimeout(pendingRefresh.current)
      window.removeEventListener("focus", scheduleRefresh)
      document.removeEventListener("visibilitychange", scheduleRefresh)
    }
  }, [router, intervalMs])

  return null
}
