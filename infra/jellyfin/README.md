# Jellyfin

Production is deployed to Synology using `docker compose`
at <http://jellyfin.imetrical.com:8096/>

```text
MEDIA_ROOT=/volume1       # Synology
MEDIA_ROOT=/Volumes/Space # galois

$MEDIA_ROOT/{Watching,Volatile}/{Movies,TV-Shows}
```

## TODO

- [ ] Validate TV-Show naming
- [ ] Run the Node verifier on Synology, directly or in a container

## Operations - Synology

- See [Docs for Synology](https://jellyfin.org/docs/general/installation/synology)
- Synology installs Docker at `/usr/local/bin/docker`, which is not in the
  non-interactive SSH `PATH`.
- Run Docker remotely from galois:

  ```bash
  ssh syno /usr/local/bin/docker logs -f jellyfin
  ```

## Development - galois

```bash
mkdir -p ./data/{config,cache}
docker compose -f compose-galois.yaml up -d
docker compose -f compose-galois.yaml down
```

Local Jellyfin state is stored in `data/` and can be deleted when no longer
needed. Media is mounted read-only from `/Volumes/Space`.

## Naming and Validation

Movie libraries contain canonical `Title (Year).mp4` files and optional matching
`.srt` sidecars. The read-only verifier uses `ffprobe` to check file types,
embedded title/year tags, canonical names, and sidecars.

```bash
node scripts/verify-canonical-names.mjs --help
node scripts/verify-canonical-names.mjs
```

Generate and review an incremental rename script on galois, then run it against
either copy of the media:

```bash
node scripts/verify-canonical-names.mjs --format bash > rename-movies.sh
bash rename-movies.sh                 # galois
ssh syno bash -s < rename-movies.sh   # syno
```

Both scripts detect `/Volumes/Space` or `/volume1`, validate the two movie
directories, and accept an explicit root override when needed.
