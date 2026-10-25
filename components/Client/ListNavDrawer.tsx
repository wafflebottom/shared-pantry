"use client"

import { useRef } from "react"
import Link from "next/link"
import { House, ListChecks, Menu, Plus, X } from "lucide-react"
import CreateListDialog from "@/components/Client/CreateListDialog"

type Props = {
  lists: { id: number; store: string }[]
  currentListID?: number
  currentFullList?: boolean
}

export default function ListNavDrawer({ lists, currentListID, currentFullList }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const createDialogRef = useRef<HTMLDialogElement>(null)
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Open navigation"
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#a50036] hover:bg-rose-300"
      >
        <Menu className="h-6 w-6" />
      </button>

      <dialog
        ref={dialogRef}
        className="m-0 left-0 right-auto top-0 h-dvh max-h-dvh w-72 max-w-[85vw] rounded-none bg-white p-0 font-sans text-base"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <span className="text-lg font-bold text-gray-700">Lists</span>
          <button type="button" onClick={close} aria-label="Close navigation">
            <X />
          </button>
        </div>

        <nav className="flex flex-col px-2 pb-4">
          <Link href="/" onClick={close} className="flex items-center gap-2 rounded-md px-3 py-2 text-gray-700 hover:bg-rose-50">
            <House className="h-5 w-5" /> Home
          </Link>

          <Link href="/full-list" onClick={close} className={`flex items-center gap-2 rounded-md px-3 py-2 hover:bg-rose-50 ${currentFullList ? "bg-rose-100 font-semibold text-rose-900" : "text-gray-700"}`}>
            <ListChecks className="h-5 w-5" /> Full List
          </Link>

          <div className="my-2 h-px bg-rose-200" />

          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/list-item/${list.id}`}
              onClick={close}
              className={`rounded-md px-3 py-2 hover:bg-rose-50 ${
                list.id === currentListID ? "bg-rose-100 font-semibold text-rose-900" : "text-gray-700"
              }`}
            >
              {list.store}
            </Link>
          ))}

          <div className="my-2 h-px bg-rose-200" />

          <button
            type="button"
            onClick={() => {
              close()
              createDialogRef.current?.showModal()
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-gray-700 hover:bg-rose-50"
          >
            <Plus className="h-5 w-5" /> New list
          </button>
        </nav>
      </dialog>

      <CreateListDialog dialogRef={createDialogRef} />
    </>
  )
}
