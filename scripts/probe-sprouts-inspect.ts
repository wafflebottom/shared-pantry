// Inspect v2: find the exact route from a placement to a product's name
// and price. Prints paths, not guesses.
// Usage: npx tsx scripts/probe-sprouts-inspect.ts [path-to-json]
import { readFile } from "node:fs/promises"

type AnyObj = Record<string, unknown>

function walk(node: unknown, path: string, visit: (node: unknown, path: string) => void, depth: number) {
  if (depth > 14 || node === null || typeof node !== "object") return
  visit(node, path)
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${i}]`, visit, depth + 1))
    return
  }
  for (const [k, v] of Object.entries(node as AnyObj)) {
    walk(v, path ? `${path}.${k}` : k, visit, depth + 1)
  }
}

async function main() {
  const path = process.argv[2] ?? "sprouts-probe.json"
  const data = JSON.parse(await readFile(path, "utf8"))
  const placements = (data.data as AnyObj).searchResultsPlacements as AnyObj
  const list = placements.placements as AnyObj[]
  console.log(`placements: ${list.length}`)

  // 1. placements grouped by content typename
  const groups = new Map<string, number>()
  for (const p of list) {
    const content = p.content as AnyObj | undefined
    const t = typeof content?.__typename === "string" ? (content.__typename as string) : "(no content)"
    groups.set(t, (groups.get(t) ?? 0) + 1)
  }
  console.log("placements by content type:")
  for (const [t, c] of [...groups.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c} × ${t}`)
  }

  // 2. first item-grid placement: its content keys + first item-ish child
  const grid = list.find(
    (p) => (p.content as AnyObj)?.__typename === "SearchContentManagementSearchItemGrid"
  )
  if (grid) {
    const content = grid.content as AnyObj
    console.log("\nfirst item-grid content keys:", Object.keys(content).join(", "))
    for (const [k, v] of Object.entries(content)) {
      if (Array.isArray(v)) {
        console.log(`  content.${k}: array of ${v.length}; first item keys: ${v.length ? Object.keys(v[0] as AnyObj).join(", ") : "(empty)"}`)
        if (v.length) {
          console.log(`  first ${k} item (truncated):`)
          console.log(JSON.stringify(v[0], null, 2).slice(0, 2500))
        }
      } else if (v !== null && typeof v === "object") {
        console.log(`  content.${k}: object keys: ${Object.keys(v as AnyObj).join(", ")}`)
      } else {
        console.log(`  content.${k}: ${String(v)}`)
      }
    }
  }

  // 3. paths to priceString values (first 15) and name values (first 15)
  const prices: { path: string; value: unknown }[] = []
  const names: { path: string; value: unknown }[] = []
  const props: AnyObj[] = []
  walk(data, "", (node, p) => {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return
    const obj = node as AnyObj
    if (obj.__typename === "SearchItemProperties" && props.length < 2) props.push(obj)
    if (typeof obj.priceString === "string" && prices.length < 15) {
      prices.push({ path: p, value: obj.priceString })
    }
    if (
      typeof obj.name === "string" &&
      (obj.name as string).length > 10 &&
      names.length < 15
    ) {
      names.push({ path: p, value: obj.name })
    }
  }, 0)
  console.log(`\npriceString occurrences (first 15 of ${prices.length} shown cap):`)
  for (const pr of prices) console.log(`  ${pr.value}  @ ${pr.path}`)
  console.log("\nname occurrences (first 15):")
  for (const n of names) console.log(`  ${n.value}  @ ${n.path}`)

  // 4. one full SearchItemProperties object
  if (props.length) {
    console.log("\nfirst SearchItemProperties object:")
    console.log(JSON.stringify(props[0], null, 2).slice(0, 3000))
  }
}

main()
