# Jellyfin

Media server. Production runs on Syno via `docker compose`; a second, disposable instance runs on Galois for local development against the same media library.

## Language

**Jellyfin (production)**:
The Syno deployment, at `jellyfin.imetrical.com:8096`. Mounts `/volume1/{Watching,Volatile,Home-Movies}` read-only from Syno's shares. `infra/jellyfin/compose.yaml` in this repo is a **reference copy**, not the live source — Syno's actual `/volume1/docker/jellyfin/compose.yaml` is deployed manually (no CI/CD); keep the two in sync by hand when either changes.

**Jellyfin (galois)**:
A disposable local instance on Galois (`compose-galois.yaml`), for development/validation. Reads the same media read-only from `/Volumes/Space`, but its `data/` (config+cache) is local and can be deleted anytime — no state worth preserving there.

**Media Root**:
The parent path containing the library, named `MEDIA_ROOT` in docs — `/volume1` on Syno, `/Volumes/Space` on Galois. Both are the same underlying media, not independent copies (see Synk for the offsite mirror).

**Canonical name**:
The required movie file naming convention: `Title (Year).mp4` with an optional matching `.srt` sidecar. Enforced by the read-only verifier (`scripts/verify-canonical-names.mjs`), which uses `ffprobe` to check file types and embedded title/year tags before generating a rename script.
