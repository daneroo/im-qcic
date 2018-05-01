# Pubnub experiment for qcic

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

