import type { PickerProduct } from "@/lib/price-fetch"

// How a picked store product fills a dialog's fields. The add dialog
// backs these with state setters, the edit dialog with input refs — the
// pick rule is the same either way.
export type ProductPickFields = {
  setTitle: (value: string) => void
  setBrand: (value: string) => void
  setPrice: (value: string) => void
  setQty: (value: string) => void
  setUnit: (value: string) => void
}

// A pick adopts the product's identity — title, brand, size, and price
// when the store serves one. A priceless pick (Whole Foods) leaves the
// price field untouched. The fields stay editable, and nothing saves
// until the check is tapped.
export function applyProductPick(
  product: PickerProduct,
  fields: ProductPickFields,
  onSizeApplied?: () => void
): void {
  fields.setTitle(product.title)
  fields.setBrand(product.brand ?? "")
  if (product.price != null) fields.setPrice(product.price.toFixed(2))
  if (product.itemQty != null && product.itemUnit) {
    fields.setQty(String(product.itemQty))
    fields.setUnit(product.itemUnit)
    onSizeApplied?.()
  }
}
