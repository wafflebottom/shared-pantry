"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ck-bg px-4 text-center font-sans">
      <h1 className="font-serif text-xl text-ck-ink">Something went wrong</h1>
      <p className="text-sm text-ck-muted">
        The pantry hit a snag. Your lists are safe — try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="cursor-pointer rounded-lg bg-ck-primary px-4 py-2 font-medium text-white"
      >
        Try again
      </button>
    </div>
  )
}
