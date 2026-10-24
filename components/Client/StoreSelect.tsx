"use client"

import { useState } from "react"
import { STORES } from "@/lib/stores"

const OTHER = "__other"

const fieldClass =
  "flex-1 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"

// Exact store picker for list tiles. A canonical store is submitted as-is,
// so the tile's store matches the price registry key exactly and price
// lookup/search fire. "Other…" reveals a free-text input for custom lists
// like Farmers Market, which keep working exactly as before.
export default function StoreSelect({ defaultValue = "" }: { defaultValue?: string }) {
  const initialIsOther = defaultValue !== "" && !STORES.includes(defaultValue)
  const [choice, setChoice] = useState(initialIsOther ? OTHER : defaultValue)
  const [custom, setCustom] = useState(initialIsOther ? defaultValue : "")
  const isOther = choice === OTHER

  return (
    <>
      <label className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-neutral-500">Store:</span>
        <select
          name={isOther ? "store-choice" : "store"}
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          required
          className={fieldClass}
        >
          <option value="" disabled>
            Choose a store…
          </option>
          {STORES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={OTHER}>Other…</option>
        </select>
      </label>
      {isOther && (
        <label className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-neutral-500">Name:</span>
          <input
            name="store"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Store name"
            required
            className={fieldClass}
            autoComplete="off"
          />
        </label>
      )}
    </>
  )
}
