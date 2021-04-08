# Backups

Investigating backup solutions

- from host
- from docker container

See benchmarking (from duplicacy - compare with restic)

## TODO

- redo mount/user : /dockerlan/docker
- compare speeds (current)
- baseline restic (pick a dataset like /ebooks, or /audiobooks)
- baseline duplicacy
- lifecycles
  - incremental backup
  - restore
  - list, compare 2
  - multiple origins
  
## Transports

- SMB/CIFS (samba)
- [restic](https://restic.net/)
- [duplicacy](https://github.com/gilbertchen/duplicacy)

Speeds:


## Drobo Over Samba

This objective here is to capitalize on the Drobo 5N as a large storage pool.

### Host mounted samba (MacOS)

```bash
# mount: //kubernaut@drobo/KubeVol on /Volumes/KubeVol (smbfs, nodev, nosuid, mounted by daniel)
time rsync -av --progress  /Volumes/KubeVol/random.bin  .
random.bin  1015625000 100%   51.23MB/s    0:00:18

time rsync -av --progress random.bin  /Volumes/KubeVol/
random.bin  1015625000 100%   47.48MB/s    0:00:20 
```

### Talk to Drobo with `smbclient` - from `docker`

```bash
docker run --rm -it ubuntu:20.04
apt update
apt install smbclient openssl -y
# make a iGB file
openssl rand -out random.bin -base64 $(( 2**30 * 3/4 ))
smbclient --user kubernaut //drobo.imetrical.com/KubeVol
smb: \> put random.bin
putting file random.bin as \random.bin (31709.9 kb/s) (average 31709.9 kb/s)
smb: \> ls
  random.bin                          A 1015625000  Tue Feb  4 02:19:56 2020
  README.md                           N       61  Tue Feb  4 02:05:58 2020
smb: \> get random.bin
getting file \random.bin of size 1015625000 as random.bin (24064.0 KiloBytes/sec) (average 23185.6 KiloBytes/sec)
```

### Mount from within docker

Normally mounting a CIFS from docker would require `--privileged` *(or at least `--cap-add SYS_ADMIN --cap-add DAC_READ_SEARCH`)

smbclient --user kubernaut //drobo.imetrical.com/KubeVol

```bash
docker run --rm  -it --cap-add SYS_ADMIN --cap-add DAC_READ_SEARCH ubuntu:20.04
apt update
apt install cifs-utils openssl rsync -y
mkdir -p /KubeVol
mount -t cifs //drobo.imetrical.com/KubeVol /KubeVol -o user=kubernaut,password=XXXX

# 1GB file
openssl rand -out random.bin -base64 $(( 2**30 * 3/4 ))

time rsync -av --progress  ./random.bin /KubeVol/
random.bin  1,015,625,000 100%   20.00MB/s    0:00:48 (xfr#1, to-chk=0/1)

time rsync -av --progress  /KubeVol/random.bin .
random.bin  1,015,625,000 100%   21.09MB/s    0:00:45 (xfr#1, to-chk=0/1)
```

## Docker Volume

USAGE:

```bash
make up
make exec
# apt update && apt install -y rsync
# time rsync -av --progress  /drobo/random.bin .
# random.bin 1,015,625,000 100%   22.16MB/s    0:00:43
make down
make clean
```

## Restic - docker - drobo

```bash
# make up
# make exec
apt update && apt install -y restic rsync jq wget
mkdir -p data && rsync -av --progress /drobo/random.bin data

export RESTIC_PASSWORD=zzz
restic init --repo /drobo/restic

# backup twice
restic -r /drobo/restic backup -v ./data
restic -r /drobo/restic backup -v ./data
# and backup with a forced Host name
restic -r /drobo/restic backup -v -H dockerbuntu ./data


# list , then compare (the last 2 snapshots)
restic -r /drobo/restic/ snapshots
# restic -r /srv/restic-repo diff 5845b002 2ab627a6
echo $(restic -r /drobo/restic/ snapshots --json | jq -r .[].id | tail -d)
restic -r /drobo/restic/ diff  $(restic -r /drobo/restic/ snapshots --json | jq -r .[].id | tail -2)

# now other sets
restic -r /drobo/restic  backup -v  /archive/media/ebooks/
restic -r /drobo/restic  backup -v  /archive/media/audiobooks
restic -r /drobo/restic  backup -v  /archive/media/audiobooks/Frank\ Herbert\ -\ Dune\ Collection/

# restore to ./coco
mkdir -p coco
restic -r /drobo/restic/ restore -v -v --verify --target ./coco/ latest
# latest for given root directory
restic -r /drobo/restic/ restore --verify --path /archive/media/audiobooks --target ./coco/  latest

# mount
# inside docker may require privileges: https://stackoverflow.com/questions/48402218/fuse-inside-docker
apt install -y fuse modprobe
modprobe fuse
mkdir /mnt/restic
restic -r /drobo/restic/ mount /mnt/restic/
```

## Duplicacy

We need a fake root: <https://github.com/gilbertchen/duplicacy/wiki/Move-.duplicacy-folder>

Programmatic way to download latest release: <https://www.starkandwayne.com/blog/how-to-download-the-latest-release-from-github/>

```bash
wget https://github.com/gilbertchen/duplicacy/releases/download/v2.7.2/duplicacy_linux_x64_2.7.2
mv ./duplicacy_linux_x64_2.7.2 /usr/local/bin/duplicacy
chmod +x /usr/local/bin/duplicacy

mkdir -p duplicacyFakeRoot && cd duplicacyFakeRoot
ln -sf /archive/media/ebooks ebooks
ln -sf /archive/media/audiobooks audiobooks
duplicacy init archive-media /drobo/duplicacy

duplicacy backup
duplicacy backup -hash

duplicacy check -files -stats

duplicacy benchmark
```

## compare with restic and duplicay on MacOS native

```bash
brew install restic
brew instal duplicacy
```
