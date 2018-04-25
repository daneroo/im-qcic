# Pubnub experiment for qcic

## TODO 

- s3-db to store alarms 
- integrate with slack (alarm until cleared)
- quorum for scrobbleCast
- out of sync for scrobbleCast
- quorum (1) for ted1k
- QoS for ted1k (samples in last minute/hour/day)

## Simple
- publish heartbeat (interval)
- subscribe to heartbeat
```
npm start -- -s
npm start -- -p
npm start -- -p
```


## req-response (like nats...)

- subscribe to req responding with heartbeat payload
- publish req 