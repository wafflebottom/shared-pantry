"use client"

import { useRef } from "react"
import { Plus } from "lucide-react"
import CreateListDialog from "@/components/Client/CreateListDialog"

export default function RequestNewListTile() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="New list"
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ck-ink hover:bg-ck-chip"
      >
        <Plus />
      </button>

      <CreateListDialog dialogRef={dialogRef} />
    </>
  )
}
