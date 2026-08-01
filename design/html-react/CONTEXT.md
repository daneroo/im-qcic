# Design/html-react

A standalone, buildless UI prototype (Tailwind CDN + React CDN + Babel Standalone, single `index.html`) exploring the visual language for a QCIC status dashboard. Actively worked on — this is where the repo's core metrics get their first real presentation layer.

## Language

**Metric card**:
The dashboard's unit of display. Structured as Primary Label → Primary Metric (Value + optional Unit) → Secondary Metric(s) → Supplementary Elements → Byline (the source NATS subject, lowercase).

**Theme tokens** vs **Semantic tokens**:
Two distinct layers of color, not yet fully separated. Theme tokens are contextual/aesthetic (card surface, border, glow) and vary per theme (Sketch/Midnight/Shadow). Semantic tokens are data-driven and meaning-based (warning, liveness, agreement/divergence) and must stay legible across all three themes.

**Heartbeat** (card):
Renders Natsql's `im.qcic.heartbeat` subject — count of hosts broadcasting per second, plus delay.

**Cast Synch** (card):
Renders Scrobblecast's three-copy sync state — a digest (e.g. `sha1:0f5218c`) of the full podcast-listening history, and how many of the three hosts agree on it.

**Ted1k Status** (card):
Renders Ted's power-monitor data via Status's `tedcheck` — a "9's" uptime-style figure over `watt` samples/missing counts.
