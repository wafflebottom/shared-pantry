import type { ProductResult } from "@/lib/product"

// Shared plumbing for the store adapters: fetch with a timeout, cookie
// harvesting, result dedup, and parallel batching. Per-store UA strings,
// headers, retry triggers, and regexes stay in each adapter.

export type JsonObj = Record<string, unknown>

const FETCH_TIMEOUT_MS = 8000

export function logAdapterFailure(store: string, query: string, detail: string): void {
  console.error(`[price-fetch] ${store} query="${query}" failed: ${detail}`)
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
}

// "name=value; name=value" from a response's Set-Cookie headers.
export function cookiesToHeader(res: Response): string | null {
  const header = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ")
  return header || null
}

// Text fetch that returns null (and logs one line) on a non-OK status,
// a network error, or a timeout — never throws.
export async function fetchText(
  url: string,
  headers: Record<string, string>,
  store: string,
  query: string
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, { headers, cache: "no-store" })
    if (!res.ok) {
      logAdapterFailure(store, query, `HTTP ${res.status}`)
      return null
    }
    return await res.text()
  } catch (e) {
    logAdapterFailure(
      store,
      query,
      e instanceof Error ? `${e.name}: ${e.message}` : "fetch error"
    )
    return null
  }
}

// JSON twin of fetchText: null (and one log line) on a non-OK status,
// a network error, a timeout, or an unparseable body — never throws.
export async function fetchJson(
  url: string,
  headers: Record<string, string>,
  store: string,
  query: string
): Promise<unknown> {
  try {
    const res = await fetchWithTimeout(url, { headers, cache: "no-store" })
    if (!res.ok) {
      logAdapterFailure(store, query, `HTTP ${res.status}`)
      return null
    }
    try {
      return await res.json()
    } catch {
      logAdapterFailure(store, query, "invalid JSON")
      return null
    }
  } catch (e) {
    logAdapterFailure(
      store,
      query,
      e instanceof Error ? `${e.name}: ${e.message}` : "fetch error"
    )
    return null
  }
}

// First occurrence wins, order preserved.
export function dedupeProducts(results: ProductResult[]): ProductResult[] {
  const seen = new Set<string>()
  const out: ProductResult[] = []
  for (const r of results) {
    if (!seen.has(r.name)) {
      seen.add(r.name)
      out.push(r)
    }
  }
  return out
}

// Run fn over the items in batches, all batches in parallel; results come
// back in input order (Promise.all preserves chunk order, flat preserves
// within-chunk order).
export async function mapBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize))
  }
  const results = await Promise.all(chunks.map(fn))
  return results.flat()
}
