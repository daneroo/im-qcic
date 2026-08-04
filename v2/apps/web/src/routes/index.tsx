import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "../components/ThemeToggle";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">im-qcic</h1>
        <ThemeToggle />
      </div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">
        <Link to="/scast" className="underline">
          scast
        </Link>{" "}
        and{" "}
        <Link to="/tedcheck" className="underline">
          tedcheck
        </Link>{" "}
        are live.
      </p>
    </main>
  );
}
