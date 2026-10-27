import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ck-bg px-4 text-center font-sans">
      <h1 className="font-serif text-xl text-ck-ink">That page isn&apos;t in the pantry</h1>
      <p className="text-sm text-ck-muted">
        The link may be mistyped, or the list may have been deleted.
      </p>
      <Link href="/" className="rounded-lg bg-ck-primary px-4 py-2 font-medium text-white">
        Back to your lists
      </Link>
    </div>
  )
}
