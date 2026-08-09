import { createFileRoute } from "@tanstack/react-router";
// PROTOTYPE — wordmark comparison bench. See ../prototype/README.md.
//
// WHY THIS PAGE EXISTS. Four serifs were tried serially for the QCIC wordmark
// and each was judged from a screenshot, which is exactly the wrong loop:
// stroke rendering is the one thing a 1x screenshot cannot show. So here they
// all are at once, at real size, in the real masthead composition, on the real
// theme — pick one by looking, not by iterating.
//
// THE DIAGNOSIS the first four attempts missed: Cormorant, Cinzel and the
// system Times-alike are all DISPLAY faces, drawn for 60px+ where extreme
// thick/thin contrast is the point. At 20-30px their hairlines land under one
// device pixel and break up. The candidates below are grouped by that axis,
// because it — not "which serif do I like" — is what decides whether this
// renders cleanly.

import { VariantSwitcher } from "../prototype/VariantSwitcher";
import { validatePrototypeSearch } from "../prototype/variants";

export const Route = createFileRoute("/prototype/mark")({
  validateSearch: validatePrototypeSearch,
  component: MarkBench,
  head: () => ({
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,600;0,700;1,500&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,400&family=Libre+Baskerville:ital,wght@0,700;1,400&family=EB+Garamond:ital,wght@0,600;0,700;1,500&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Bitter:ital,wght@0,700;1,500&family=Playfair+Display:ital,wght@0,700;1,500&display=swap",
      },
    ],
  }),
});

interface Candidate {
  id: string;
  name: string;
  stack: string;
  weight: number;
  /** Tracking that suits this face's width at wordmark size. */
  tracking: string;
  note: string;
  /** Extra CSS the face's variable axes want. */
  style?: React.CSSProperties;
}

// Grouped by stroke contrast, lowest risk first — that is the axis that
// decides whether hairlines survive at this size.
const TEXT_SERIFS: Candidate[] = [
  {
    id: "spectral",
    name: "Spectral",
    stack: '"Spectral", serif',
    weight: 600,
    tracking: "0.10em",
    note: "Screen-first, low contrast. Designed by Production Type for on-screen reading — the safest thing here at this size, and still unmistakably a serif.",
  },
  {
    id: "newsreader",
    name: "Newsreader",
    stack: '"Newsreader", serif',
    weight: 600,
    tracking: "0.09em",
    note: "Has a real optical-size axis, so the glyphs are drawn differently per size rather than scaled. More warmth than Spectral, same low rendering risk.",
    style: { fontVariationSettings: '"opsz" 24' },
  },
  {
    id: "libre-baskerville",
    name: "Libre Baskerville",
    stack: '"Libre Baskerville", serif',
    weight: 700,
    tracking: "0.06em",
    note: "Drawn for body text on screens: wide, sturdy, generous x-height. The thickest strokes of the text group — closest to a printed page.",
  },
];

const CHARACTER_SERIFS: Candidate[] = [
  {
    id: "fraunces",
    name: "Fraunces",
    stack: '"Fraunces", serif',
    weight: 700,
    tracking: "0.06em",
    note: "Optical-size axis plus a 'wonk' axis. Set here at its display optical size with wonk on — the most characterful option that still holds together small.",
    style: { fontVariationSettings: '"opsz" 40, "SOFT" 20, "WONK" 1' },
  },
  {
    id: "eb-garamond",
    name: "EB Garamond",
    stack: '"EB Garamond", serif',
    weight: 600,
    tracking: "0.10em",
    note: "The classical register Cormorant was reaching for, but drawn with real weight instead of hairlines. Closest in spirit to the drawn monogram.",
  },
];

const SLABS: Candidate[] = [
  {
    id: "bitter",
    name: "Bitter",
    stack: '"Bitter", serif',
    weight: 700,
    tracking: "0.08em",
    note: "A slab: contrast is nearly flat, so there is no hairline to lose. Zero rendering risk by construction, at the cost of some elegance.",
  },
];

const DISPLAY: Candidate[] = [
  {
    id: "playfair",
    name: "Playfair Display",
    stack: '"Playfair Display", serif',
    weight: 700,
    tracking: "0.04em",
    note: "Included as the control: a high-contrast display face, the same category as Cormorant and Cinzel. If this one also looks brittle to you, the category is confirmed as the problem.",
  },
];

function Row({ c }: { c: Candidate }) {
  return (
    <section className="border-b border-rule py-7 last:border-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-ink">{c.name}</span>
        <code className="qc-digest text-[10px] text-ink-3">
          {c.weight} · {c.tracking} tracking
        </code>
      </div>

      {/* The real composition, at the real size it will be used. */}
      <div className="rounded-lg border border-rule bg-surface">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4">
          <div className="flex items-baseline gap-3">
            <span
              className="leading-none text-ink"
              style={{
                fontFamily: c.stack,
                fontWeight: c.weight,
                letterSpacing: c.tracking,
                fontSize: 26,
                WebkitFontSmoothing: "auto",
                MozOsxFontSmoothing: "auto",
                ...c.style,
              }}
            >
              QCIC
            </span>
            <span
              className="text-ink-3"
              style={{
                fontFamily: c.stack,
                fontStyle: "italic",
                fontSize: 13,
                WebkitFontSmoothing: "auto",
                MozOsxFontSmoothing: "auto",
              }}
            >
              quis custodiet ipsos custodes
            </span>
          </div>
          <span className="text-[11px] text-ink-2">ted1k · continuity</span>
        </div>
      </div>

      {/* Same face large, so the drawing is visible independent of rendering. */}
      <div className="mt-3 flex items-baseline gap-5 overflow-x-auto">
        <span
          className="leading-none whitespace-nowrap text-ink"
          style={{
            fontFamily: c.stack,
            fontWeight: c.weight,
            letterSpacing: c.tracking,
            fontSize: 64,
            WebkitFontSmoothing: "auto",
            MozOsxFontSmoothing: "auto",
            ...c.style,
          }}
        >
          QCIC
        </span>
        <span
          className="leading-none whitespace-nowrap text-ink-2"
          style={{
            fontFamily: c.stack,
            fontWeight: c.weight,
            letterSpacing: c.tracking,
            fontSize: 19,
            WebkitFontSmoothing: "auto",
            MozOsxFontSmoothing: "auto",
            ...c.style,
          }}
        >
          QCIC
        </span>
      </div>

      <p className="mt-3 max-w-prose text-[12px] leading-relaxed text-ink-2">
        {c.note}
      </p>
    </section>
  );
}

function Group({
  title,
  blurb,
  items,
}: {
  title: string;
  blurb: string;
  items: Candidate[];
}) {
  return (
    <div className="mt-10">
      <h2 className="text-sm font-medium text-ink">{title}</h2>
      <p className="mt-1 max-w-prose text-[12px] text-ink-3">{blurb}</p>
      <div className="mt-2">
        {items.map((c) => (
          <Row key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

function MarkBench() {
  const search = Route.useSearch();

  return (
    <div className="min-h-screen bg-paper pb-28">
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-lg font-medium text-ink">Wordmark bench</h1>
        <p className="mt-2 max-w-prose text-sm text-ink-2">
          Every candidate at the size it would actually be used, in the real
          masthead composition, on the current theme. Switch theme and
          light/dark from the bar below — a serif that holds up on paper can
          fall apart on the midnight ground, so it is worth checking both before
          choosing.
        </p>
        <p className="mt-3 max-w-prose text-[12px] text-ink-3">
          All of them override <code className="qc-digest">font-smoothing</code>{" "}
          back to <code className="qc-digest">auto</code>. The body sets
          Tailwind&rsquo;s <code className="qc-digest">antialiased</code>, which
          disables macOS subpixel rendering and thins every stroke — good for
          the UI sans, actively harmful to a serif.
        </p>

        <Group
          title="Text serifs — drawn for screen, low contrast"
          blurb="These are the ones most likely to look clean at 26px. Their hairlines are thicker by design, so there is nothing for the renderer to drop."
          items={TEXT_SERIFS}
        />
        <Group
          title="Character serifs — more personality, still sturdy"
          blurb="More distinctive, at slightly more rendering risk. Both use optical-size or heavier weights to keep the thin strokes above a pixel."
          items={CHARACTER_SERIFS}
        />
        <Group
          title="Slab — no hairlines at all"
          blurb="If you want a guarantee rather than a judgement call."
          items={SLABS}
        />
        <Group
          title="Control — a display serif, the category that kept failing"
          blurb="Same family of face as Cormorant and Cinzel. Compare it against the groups above to confirm the diagnosis."
          items={DISPLAY}
        />

        <p className="mt-10 max-w-prose text-sm text-ink-2">
          Tell me which one and I&rsquo;ll wire it into the masthead. If none of
          them are right, that is a useful answer too — it means the wordmark
          wants the drawn monogram rather than any typeface.
        </p>
      </main>
      <VariantSwitcher search={search} />
    </div>
  );
}
