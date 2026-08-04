import { createFileRoute } from "@tanstack/react-router";
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
        Scaffold only - live Tedcheck and Logcheck views land in follow-up
        tickets.
      </p>
    </main>
  );
}
