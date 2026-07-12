"use client";

export default function AssetsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-shell">
      <section className="card">
        <h1 className="card-title">Unable to load assets</h1>
        <p className="muted">
          Something went wrong while loading the Asset Directory.
        </p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
