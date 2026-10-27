import ItemRow from "@/components/Client/ItemRow"
import type { ComponentProps } from "react"

// The shared ItemRow render: the list page (active + completed) and the
// Full List (one group per store, plus the combined Completed section)
// all render the same 11 props per row.
export default function ItemRows({ items }: { items: ComponentProps<typeof ItemRow>[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <ItemRow key={item.id} {...item} />
      ))}
    </div>
  )
}
