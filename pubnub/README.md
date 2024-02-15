# Pubnub experiment for qcic

**2024-02-15** pubnub key deleted (disabled in their parlance)

## Deploy

This deploys, makes the alias the the latest deployment, and cleans up previous deployments

```
now --public && now alias && now rm pubnub-qcic --safe --yes
```

Deployment depends on a secret `pubnub_qcic_creds` with the contents of `credentials.saas.json`, which is `.gitignored` and therefore not uploaded

```
now secret rm pubnub_qcic_creds # requires prompt

PUBNUB_QCIC_CREDS=$(cat credentials.saas.json)
now secret add pubnub_qcic_creds "${PUBNUB_QCIC_CREDS}"
```

## TODO

- refactor for config injection (Go receiver model)
  - alarm, (db, slack), heartbeat (publisher,watcher)
- clear from api/bot - implies acknowledge state?
- quorum (1) for ted1k
- QoS for ted1k (samples in last minute/hour/day)
- quorum for scrobbleCast
- out of sync for scrobbleCast

### Done

- ~s3-db to store alarms~
- ~integrate with slack (alarm until cleared)~

## Simple

No req-resp (like nats.io)

- publish heartbeat (interval)
- subscribe to heartbeat

```
npm start -- -s
npm start -- -p
npm start -- -p
```
