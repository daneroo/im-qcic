# Backups

Investigating backup solutions

- from host
- from docker container

See benchmarking (from duplicacy - compare with restic)

## Transports

- SMB/CIFS (samba)
- [restic](https://restic.net/)
- [duplicacy](https://github.com/gilbertchen/duplicacy)

## Drobo Over Samba

This objective here is to capitalize on the Drobo 5N as a large storage pool.

### Talk to Drobo with `smbclient` - from `docker`

```bash
docker run --rm -it ubuntu:18.04
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
docker run --rm  -it --cap-add SYS_ADMIN --cap-add DAC_READ_SEARCH ubuntu:18.04
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

### K8S Storage Driver

- Try this first in multipass