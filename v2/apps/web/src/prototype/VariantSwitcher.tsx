// PROTOTYPE — throwaway. See ./README.md.
//
// Dev-only bottom bar for driving the two axes. Renders nothing in a
// production build, so nothing has to be unpicked if a variant graduates.

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  applyThemeFamily,
  THEME_LABEL,
  THEMES,
  VARIANT_BLURB,
  VARIANT_LABEL,
  VARIANTS,
  type PrototypeSearch,
} from "./variants";
import {
  applyTheme,
  persistTheme,
  resolveInitialTheme,
  toggleTheme,
  type Theme,
} from "../theme";

export function VariantSwitcher({ search }: { search: PrototypeSearch }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mode, setMode] = useState<Theme>("light");
  const [open, setOpen] = useState(true);

  // The family lives in the URL so a variant+theme combination is a shareable
  // link; light/dark stays in localStorage where the app already keeps it.
  useEffect(() => {
    applyThemeFamily(document.documentElement, search.theme);
  }, [search.theme]);

  useEffect(() => {
    setMode(
      resolveInitialTheme(
        window.localStorage,
        window.matchMedia("(prefers-color-scheme: dark)").matches,
      ),
    );
  }, []);

  useEffect(() => {
    applyTheme(document.documentElement, mode);
  }, [mode]);

  if (!import.meta.env.DEV) return null;

  const pill =
    "rounded-full px-3 py-1 text-[11px] font-medium tracking-wide transition-colors";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      <div className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-rule bg-surface/95 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3 hover:text-ink"
          aria-expanded={open}
        >
          {open ? "Prototype ▾" : "Prototype ▸"}
        </button>

        {open && (
          <>
            {/* `to="."` keeps the current route and rewrites only search —
                a dynamic `to={path}` can't be typed against the route tree. */}
            <div className="flex items-center gap-1">
              {VARIANTS.map((v) => (
                <Link
                  key={v}
                  to="."
                  search={{ ...search, variant: v }}
                  title={VARIANT_BLURB[v]}
                  className={`${pill} ${
                    search.variant === v
                      ? "bg-ink text-paper"
                      : "text-ink-2 hover:bg-surface-2"
                  }`}
                >
                  {VARIANT_LABEL[v]}
                </Link>
              ))}
            </div>

            <div className="h-4 w-px bg-rule" />

            <div className="flex items-center gap-1">
              {THEMES.map((t) => (
                <Link
                  key={t}
                  to="."
                  search={{ ...search, theme: t }}
                  className={`${pill} ${
                    search.theme === t
                      ? "bg-accent text-paper"
                      : "text-ink-2 hover:bg-surface-2"
                  }`}
                >
                  {THEME_LABEL[t]}
                </Link>
              ))}
            </div>

            <div className="h-4 w-px bg-rule" />

            <button
              type="button"
              onClick={() => {
                const next = toggleTheme(mode);
                persistTheme(window.localStorage, next);
                setMode(next);
              }}
              aria-label="Toggle light and dark"
              className={`${pill} border border-rule text-ink-2 hover:bg-surface-2`}
            >
              {mode === "dark" ? "Dark" : "Light"}
            </button>

            <div className="h-4 w-px bg-rule" />

            {/* Literal `to` values — the router types each route's search
                requirements, so these can't be built from a loop. */}
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                search={search}
                className={`${pill} ${path === "/" ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"}`}
              >
                QCIC
              </Link>
              <Link
                to="/tedcheck"
                search={search}
                className={`${pill} ${path === "/tedcheck" ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"}`}
              >
                Ted
              </Link>
              <Link
                to="/scast"
                search={search}
                className={`${pill} ${path === "/scast" ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"}`}
              >
                Scast
              </Link>
              <Link
                to="/prototype/network"
                search={search}
                className={`${pill} ${path === "/prototype/network" ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"}`}
              >
                Network
              </Link>
              <Link
                to="/prototype/mark"
                search={search}
                className={`${pill} ${path === "/prototype/mark" ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"}`}
              >
                Mark
              </Link>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
