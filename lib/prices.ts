export function itemKeyFor(title: string, brand?: string | null): string {
  const t = title.trim().toLowerCase()
  const b = (brand ?? "").trim().toLowerCase()
  return b ? `${t} | ${b}` : t
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`
}
