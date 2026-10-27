"use client"

import { useEffect, useState, useTransition, type RefObject } from "react"
import { Search } from "lucide-react"
import { getPriceSearchInfo, searchStoreProductsAction } from "@/app/actions/prices"
import type { PickerProduct } from "@/lib/price-fetch"
import { formatPrice } from "@/lib/price-book"

type Props = {
  listTileID: number
  onPick: (product: PickerProduct) => void
  // Optional: lets the hosting dialog focus the search input on open.
  inputRef?: RefObject<HTMLInputElement | null>
}

type SearchInfo = { supported: boolean; store: string | null }

// One support check per dialog open, not cached across opens: a list
// renamed to another store must not keep the old store's flag/label.
async function loadInfo(listTileID: number): Promise<SearchInfo> {
  try {
    return await getPriceSearchInfo(listTileID)
  } catch {
    return { supported: false, store: null }
  }
}

// Store product search for the item dialogs. Renders its shell immediately
// so the option is visible the moment a dialog opens; the Search button
// enables once the store check lands, and the section removes itself only
// when the store is confirmed unsupported. Picking a result hands the
// enriched product to the dialog, which fills its own fields.
export default function ProductSearch({ listTileID, onPick, inputRef }: Props) {
  const [info, setInfo] = useState<SearchInfo | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PickerProduct[]>([])
  const [searched, setSearched] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    loadInfo(listTileID).then((result) => {
      if (!cancelled) setInfo(result)
    })
    return () => {
      cancelled = true
    }
  }, [listTileID])

  if (info && !info.supported) return null

  const storeLabel = info?.store ?? "this store"

  const runSearch = () => {
    const q = query.trim()
    if (q.length < 2) return
    startTransition(async () => {
      const found = await searchStoreProductsAction(listTileID, q)
      setResults(found)
      setSearched(true)
    })
  }

  const handlePick = (product: PickerProduct) => {
    onPick(product)
    setResults([])
    setSearched(false)
    setQuery("")
  }

  return (
    <div className="mt-4 border-t border-ck-border pt-3">
      <p className="mb-2 text-xs font-medium text-ck-muted">
        Find at {storeLabel}
      </p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              runSearch()
            }
          }}
          placeholder="Search products…"
          className="min-w-0 flex-1 rounded-md bg-ck-bg px-2 py-1 text-ck-ink outline-none focus:bg-ck-surface focus:ring-1 focus:ring-ck-primary"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={!info || pending}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-ck-primary px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          <Search size={14} />
          {pending ? "…" : "Search"}
        </button>
      </div>
      {searched && results.length === 0 && !pending && (
        <p className="mt-2 text-sm text-ck-muted">No matches at {storeLabel}.</p>
      )}
      {results.length > 0 && (
        <ul className="mt-2 max-h-48 divide-y divide-ck-border overflow-y-auto rounded-md ring-1 ring-ck-border">
          {results.map((p) => (
            <li key={p.name}>
              <button
                type="button"
                onClick={() => handlePick(p)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ck-chip"
              >
                <span className="text-sm">{p.name}</span>
                {p.price != null ? (
                  <span className="shrink-0 font-mono text-sm font-medium">
                    {formatPrice(p.price)}
                  </span>
                ) : (
                  <span className="shrink-0 text-sm text-ck-muted">no price</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
