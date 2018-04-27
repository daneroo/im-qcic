# Pubnub experiment for qcic

## TODO 

- s3-db to store alarms 
- refactor alarming (actual watch)
- integrate with slack (alarm until cleared)
- clear from api/bot
- quorum for scrobbleCast
- out of sync for scrobbleCast
- quorum (1) for ted1k
- QoS for ted1k (samples in last minute/hour/day)

## Simple
No req-resp (like nats.io)

- publish heartbeat (interval)
- subscribe to heartbeat
```
npm start -- -s
npm start -- -p
npm start -- -p
```

