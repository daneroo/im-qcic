# Uptime-Kuma

Just playing around (docker)

```bash
# Start with data in a docker volume (named uptime-kuma)
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

## Dump the sqlite database

```bash
docker exec -it uptime-kuma sqlite3 /app/data/kuma.db .schema
```

## Backup and restore (deprecated, but some of it works)

Backup/Restore is deprecated, but still works partially.
Careful as the backup file may contain sensitive information.

- restore from `Uptime_Kuma_Backup_2024_06_29-03_33_00.json`
- groups are restored - but members are not
- re-enable the monitors

## Heartbeat (push) Monitor

Keep `push/monitor-1` happy

```bash
while true; do curl 'http://localhost:3001/api/push/84kf7uxbrJ?status=up&msg=OK&ping=1234'; sleep 50; done
```
