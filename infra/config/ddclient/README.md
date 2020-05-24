# ddclient

Note: _This was moved from `im-ddclient`_

My setup for `spdyn.de` using docker-compose

Running on `dirac`
Using image from [linuxserver/docker-ddclient](https://github.com/linuxserver/docker-ddclient)

## Setup

create `config/ddclient.conf`, from one of the samples in `config/`

## Force update

Remove cache file (still can take 300s max),
or simply restart ddclient container

```bash
docker exec -it infra_ddclient_1 bash rm /var/cache/ddclient/ddclient.cache
```

Check to see if running:

```bash
docker exec -it infra_ddclient_1 bash

root@6828e8d2a7d7:/$ ps auxww
PID   USER     TIME   COMMAND
    1 root       0:00 s6-svscan -t0 /var/run/s6/services
   33 root       0:00 s6-supervise s6-fdholderd
  213 root       0:00 s6-supervise inotify_modify
  214 root       0:00 s6-supervise ddclient
  217 root       0:00 bash ./run
  218 abc        0:00 ddclient - sleeping for 160 seconds
  224 root       0:00 inotifywait -e modify /config/ddclient.conf
  237 root       0:00 bash
  247 root       0:00 ps auxww
```
