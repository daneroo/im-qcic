# Jellyfin

First, we will deploy to synology, using `docker compose`

## Docker on Synology

- See [Docs for Synology](https://jellyfin.org/docs/general/installation/synology)
- I also added a link: `sudo ln -s /usr/local/bin/docker /usr/bin/docker`, so that I could use:
  - use my copied galois' public ssh key in `syno:.ssh/authorized_keys`
  - `DOCKER_HOST=ssh://syno.imetrical.com docker logs -f jellyfin-jellyfin-1`

## Legacy Docker on galois

````bash
daniel@galois:.../Downloads/jellyfin ❯ ls -ld /Volumes/Space/[VW]*
0 drwxr-xr-x  4 daniel  staff  128  5 Oct  2022 /Volumes/Space/Volatile/
0 drwxr-xr-x  4 daniel  staff  128 22 Jun  2022 /Volumes/Space/Watching/
```

```bash
docker pull jellyfin/jellyfin:latest  # or docker pull ghcr.io/jellyfin/jellyfin:latest
mkdir -p ./data/{config,cache}
mkdir -p ./data/media
ln -s /Volumes/Space/Watching ./data/media/Watching
ln -s /Volumes/Space/Volatile ./data/media/Volatile

docker compose -f compose-galois.yaml up -d

# cleanup
docker compose -f compose-galois.yaml down
rm -rf data/media/
```
