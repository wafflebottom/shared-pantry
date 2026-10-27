"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { House, ListChecks, Menu, Plus, X } from "lucide-react"
import CreateListDialog from "@/components/Client/CreateListDialog"

type Props = {
  lists: { id: number; store: string }[]
  currentListID?: number
  currentFullList?: boolean
}

// The nav lives in two places that share one create dialog:
// - mobile (below lg): a hidden <dialog> drawer opened by the Menu
//   button, with a backdrop, exactly as before.
// - desktop (lg+): a permanently exposed fixed sidebar — surface
//   background, 1px right border, no dialog, no backdrop, no blur.
// The page content shifts right on desktop (lg:pl-56 on each page's
// outer div, plus matching lg offsets on the Header and Footer) so
// nothing sits under the sidebar.
export default function ListNavDrawer({ lists, currentListID, currentFullList }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const createDialogRef = useRef<HTMLDialogElement>(null)
  const close = () => dialogRef.current?.close()
  const openCreate = () => {
    close()
    createDialogRef.current?.showModal()
  }

  const homeClass = "flex items-center gap-2 rounded-md px-3 py-2 text-ck-ink hover:bg-ck-chip"
  const fullListClass = `flex items-center gap-2 rounded-md px-3 py-2 hover:bg-ck-chip ${currentFullList ? "bg-ck-chip font-semibold text-ck-primary" : "text-ck-ink"}`
  const listClass = (list: { id: number }) =>
    `flex items-center gap-2 rounded-md px-3 py-2 hover:bg-ck-chip ${currentListID === list.id ? "bg-ck-chip font-semibold text-ck-primary" : "text-ck-ink"}`

  // Desktop sidebar links: spec sidebar styling, 12px bold, active link
  // chip background + terracotta text.
  const sidebarLinkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold hover:bg-ck-chip ${active ? "bg-ck-chip text-ck-primary" : "text-ck-ink"}`

  return (
    <>
      {/* Mobile only: the Menu button. Hidden on desktop — the sidebar
          is always visible there, so the button would be redundant. */}
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Open navigation"
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ck-ink hover:bg-ck-chip lg:hidden"
      >
        <Menu />
      </button>

      {/* Desktop sidebar (lg+): fixed left column, surface + right border. */}
      <aside className="fixed left-0 top-0 z-20 hidden h-dvh w-56 flex-col border-r border-ck-border bg-ck-surface lg:flex">
        <Link href="/" className="flex h-20 shrink-0 items-center gap-2 border-b border-ck-border px-4">
          <Image src="/icon.svg" alt="" width={36} height={36} />
          <span className="flex flex-col">
            <p className="font-serif leading-none text-ck-ink">Shared</p>
            <p className="font-sans text-[15px] font-bold leading-none text-ck-ink">Pantry</p>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          <Link href="/" className={sidebarLinkClass(currentListID === undefined && !currentFullList)}>
            <House />
            Home
          </Link>
          <Link href="/full-list" className={sidebarLinkClass(currentFullList === true)}>
            <ListChecks />
            Full List
          </Link>

          <p className="px-3 pb-1 pt-3 text-[9.5px] font-extrabold uppercase tracking-[0.11em] text-ck-muted">
            Lists
          </p>
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/list-item/${list.id}`}
              className={sidebarLinkClass(currentListID === list.id)}
            >
              {list.store}
            </Link>
          ))}

          <div className="my-2 h-px shrink-0 bg-ck-border" />
          <button
            type="button"
            onClick={openCreate}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs font-bold text-ck-ink hover:bg-ck-chip"
          >
            <Plus />
            New list
          </button>
        </nav>
      </aside>

      {/* Mobile drawer (below lg): unchanged. */}
      <dialog
        ref={dialogRef}
        className="m-0 h-dvh w-72 max-w-[85vw] bg-ck-surface font-sans text-sm text-ck-ink shadow-none"
      >
        <div className="flex flex-col gap-1 px-2 py-2">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="font-serif text-base text-ck-ink">Lists</p>
            <button
              type="button"
              onClick={close}
              aria-label="Close navigation"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ck-ink hover:bg-ck-chip"
            >
              <X />
            </button>
          </div>

          <Link href="/" onClick={close} className={homeClass}>
            <House />
            Home
          </Link>
          <Link href="/full-list" onClick={close} className={fullListClass}>
            <ListChecks />
            Full List
          </Link>

          <div className="mx-2 my-2 h-px shrink-0 bg-ck-border" />
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/list-item/${list.id}`}
              onClick={close}
              className={listClass(list)}
            >
              {list.store}
            </Link>
          ))}

          <div className="mx-2 my-2 h-px shrink-0 bg-ck-border" />
          <button
            type="button"
            onClick={openCreate}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-ck-ink hover:bg-ck-chip"
          >
            <Plus />
            New list
          </button>
        </div>
      </dialog>

      <CreateListDialog dialogRef={createDialogRef} />
    </>
  )
}
