# QCIC UI Theming experiment

## Project Vision

An experiment in UI layout and theming using Tailwind CSS and React components. The goal is to find the right abstractions — in CSS utility composition, component hierarchy, and design tokens — to express a specific visual language cleanly and consistently.

The exploration started from three logo assets with distinct palettes and evolved into a question: **what is the minimum, most expressive set of design primitives that can carry a look-and-feel across components?**

The eventual target is two paired themes distilled from the three source assets:

- **Mono:** A simple, near-monochromatic light/dark pair derived from the **Sketch** asset — graphite tones on warm stone, restrained and typographic.
- **Chromatic:** A more sophisticated combined theme drawing from both **Midnight** and **Shadow/Rust**. Rather than treating them as separate themes, they become complementary roles within one system:
  - _Light variant:_ Sepia/rust base with midnight-blue accents
  - _Dark variant:_ Midnight-blue base with rust/sepia accents (replacing the gold tones in the reference asset)

## Next Steps

Working with real (mock) data revealed the kinds of things that need to be properly abstracted. These aren't finished design decisions yet — they're the vocabulary that needs to be defined:

- **Color token layering** — two distinct layers need to be separated:
  - _Theme tokens_ — contextual and aesthetic (card surface, border, background, glow) — these vary per theme and define the atmosphere
  - _Semantic tokens_ — data-driven and meaning-based (out-of-bounds warning, liveness, agreement/divergence states) — these should remain consistent across themes even as the base palette shifts
  - The hard problem: a semantic "error red" still has to harmonize with all three theme backgrounds. DaisyUI/Tailwind concepts like `error`, `warning`, `success` are useful references, but the split between what belongs to the _theme_ and what belongs to the _metric card contract_ needs to be explicit
- **Typography system** — the fluid scaling approach (short values grow, long values shrink) works but the specific `clamp()` ratios need calibration; font split (mono for values, sans for chrome) should be a named convention
- **Value formatting** — digest truncation, duration humanization, and numeric formatting are currently inline hooks; they need a generalized abstraction
- **Supplementary elements** — the ping indicator is currently Heart-specific; decide whether it generalizes to a reusable pattern
- **Card hierarchy validation** — confirm Watermark → Hero → Secondary → Byline reads clearly in all theme variants

## Meaning of QCIC

**Quis custodiet ipsos custodes?**

- **The Literal Translation:** "Who will guard the guards themselves?" or "Who will watch the watchmen?"
- **Origin in Ancient Rome:** The phrase comes from the Roman poet Juvenal, who lived in the late 1st and early 2nd century AD. It is found in his work _Satires_, specifically in Satire VI (lines 347–348).

## Theming & Assets

The dashboard uses **Tailwind CSS** for layout and **Alpine.js** for state management. It is designed to swap the following local files based on the selected theme:

- **Theme: Sketch** (Light) -> `QCIC-light-sketch.png`
- **Theme: Midnight** (Dark) -> `QCIC-midnight-blue.png`
- **Theme: Shadow** (Rust) -> `QCIC-rust.png`

### Visual Constraints

- **Sketch:** Uses `bg-stone-50`, raw graphite-style borders, and `mix-blend-multiply` for the logo.
- **Midnight:** Deep celestial navy `bg-[#020617]` with golden/blue text accents.
- **Shadow:** A weathered "rust" sepia `bg-[#1c120b]` with burnished copper-toned borders.

## Metrics Semantics

To establish a strict visual language for styling, the dashboard defines the following structural nomenclature for each metric card:

**Card Hierarchy:**

- **Primary Label:** Large background identifier (e.g., `HEART`).
- **Primary Metric:** The hero data point, consisting of a **Value** and an optional **Unit**.
- **Secondary Metric(s):** Supplementary data, often consisting of a **Label**, **Value**, and optional **Unit**.
- **Supplementary Elements:** Extra visual elements like an **Animated Ping** to signal liveness.
- **Byline:** The target NATS subject in lowercase.

**Exemplars:**

- **Heart:**
  - Primary Label: `HEART`
  - Primary Metric: `12` (Value) / `hosts` (Unit)
  - Secondary Metric: `delay` (Label) / `0.4` (Value) / `s` (Unit)
  - Supplementary: Animated ping indicator
- **Cast:**
  - Primary Label: `CAST`
  - Primary Metric: `0f5218c...` (Value) / `sha256` (Unit)
  - Secondary Metric: `3` (Value) / `hosts` (Unit)
- **Ted:**
  - Primary Label: `TED`
  - Primary Metric: `0.99912` (Value) / _no units (pure number)_
  - Secondary Metric: Multiple metrics natively implying their units:
    - `samples` (Label) / `86,324` (Value - pure number)
    - `missing` (Label) / `76` (Value - pure number)
    - `24h` (Value/Unit combined as duration - no label)

### Data Representation

To support future React-style templating and rigorous type definitions, the metrics nomenclature maps to a highly structured JSON-like model utilizing a flat `metrics` array.

By flattening the data structure, we entirely decouple the data payload from the presentation layer. The UI component treats `metrics[0]` natively as the **Primary Label / Hero Metric**, extracting its value to render the giant text block and watermark label. The remaining slice (`metrics.slice(1)`) populates the secondary metric grid.

**Rules:**

- This structure inherently requires that `metrics.length >= 1`.
- Empty units (`""`) function as strict sentinels for numbers without units.
- Explicit textual units (like `"duration"`) can imply a custom formatting function payload (e.g., Go-style `XXdYYhZZm`).

```json
{
  "keyName": "Heartbeat",
  "subject": "im.qcic.heartbeat",
  "metrics": [
    { "label": "HEART", "value": 12, "unit": "hosts" },
    { "label": "delay", "value": 0.4, "unit": "s" }
  ]
}
```

```json
{
  "keyName": "Ted",
  "subject": "im.ted1k.metrics",
  "metrics": [
    { "label": "TED", "value": 0.99912, "unit": "" },
    { "label": "samples", "value": 86324, "unit": "" },
    { "label": "missing", "value": 76, "unit": "" },
    { "label": "duration", "value": 86400, "unit": "duration" }
  ]
}
```

## Metric Definitions

The dashboard displays three specific data points in a responsive grid:

- **Heartbeat**
  - **Context:** Number of hosts that are broadcasting a heartbeat on the NATS subject `im.qcic.heartbeat` every second.
- **Cast Synch**
  - **Context:** Three workers scraping and synchronizing amongst themselves a full podcast listening history/activity. The entire state (history) is captured in a digest (e.g., `sha1:0f5218c`) and the metric tracks the number of hosts that agree (usually 3).
- **Ted1k Status**
  - **Context:** A whole home energy capture process (1 reading per second). "9's" is used as a top-level fun metric. Underneath, it tracks data format like:

    ```text
    Last fetched at 2026-02-27 - a few seconds ago
    since          watt   samples   missing
    2026-02-26 15  1797   86325     75
    ```

  - **Note:** Additional views for last day summary, last day per hour, and last month per day exist elsewhere.

## Tech Stack

- **Styling:** Tailwind CSS (CDN, no build step)
- **Logic:** React 18 (CDN) with Babel Standalone for in-browser JSX
- **Fonts:** JetBrains Mono (metrics) + Outfit (UI) via Google Fonts
- **Environment:** iMetrical Homelab — NATS subjects as data identifiers

### Implementation Notes

- Single self-contained `index.html`. No server, no bundler. Open directly in a browser.
- Theme state lives in React (`useState`). A `useEffect` writes theme classes directly to `document.body`.
- Hero metric font size uses pure CSS `clamp()` via an inline style, driven by a `--text-len` CSS custom property set from JS. This avoids Tailwind JIT dynamic class issues:

  ```css
  /* Short values (e.g. "12 hosts") → scale UP */
  font-size: clamp(3rem, 24cqi, 7rem);

  /* Standard / long values (e.g. hash) → progressively shrink */
  font-size: clamp(1.5rem, calc(20cqi - (var(--text-len) * 0.5cqi)), 3.5rem);
  ```

- Cards use `@container` queries (`cqi` units) so the hero value scales relative to the card width, not the viewport.
- Card layout is `flex flex-col h-full` with `mt-auto` on the byline, locking all bylines flush to the bottom of the grid row.
