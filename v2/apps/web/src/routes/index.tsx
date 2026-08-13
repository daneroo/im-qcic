import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

// Placeholder until #268 builds the real home page — every subject at one
// reading each. The theme controls that used to live here are now in the
// shared header, on every page.
function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold text-ink">im-qcic</h1>
      <p className="mt-4 text-ink-2">
        <Link to="/scast" className="underline decoration-rule-strong">
          scast
        </Link>{" "}
        and{" "}
        <Link to="/tedcheck" className="underline decoration-rule-strong">
          tedcheck
        </Link>{" "}
        are live.
      </p>
    </main>
  );
}
