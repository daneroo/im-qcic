import { Link } from "@tanstack/react-router";
import { PILL } from "./pill";
import { ThemeFamilyToggle } from "./ThemeFamilyToggle";
import { ThemeToggle } from "./ThemeToggle";

// The one piece of chrome every page carries: the wordmark, the subjects, and
// both theme axes. It replaces the prototype's dev-only bottom bar, so unlike
// that bar it ships to production — a reader on a phone gets the same controls
// as a developer.
//
// Lives in __root.tsx's shell rather than in each route, so a new page cannot
// forget it.

// ink-2, not ink-3: measured against every paper in theme.css, ink-3 lands
// between 2.8:1 and 4.4:1, which is under AA for 11px chrome. ink-2 clears
// 4.37:1 in the worst of the six (catppuccin light).
const navLink = `${PILL} text-ink-2 hover:bg-surface-2 hover:text-ink`;
const navLinkActive = `${navLink} bg-surface-2 text-ink`;

export function PageHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-8">
        <Link
          to="/"
          className="qc-mark text-[22px] leading-none tracking-[0.02em] text-ink"
          aria-label="QCIC home"
        >
          QCIC
        </Link>

        <nav aria-label="Subjects" className="flex items-center gap-1">
          {/* Literal `to` values let the router type each route. */}
          <Link
            to="/ted1k"
            className={navLink}
            activeProps={{ className: navLinkActive }}
          >
            ted1k
          </Link>
          <Link
            to="/scast"
            className={navLink}
            activeProps={{ className: navLinkActive }}
          >
            scast
          </Link>
          <Link
            to="/network"
            className={navLink}
            activeProps={{ className: navLinkActive }}
          >
            network
          </Link>
        </nav>

        {/* Two controls, one per theme axis: which family, and light vs dark
            within it. */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeFamilyToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
