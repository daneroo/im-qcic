# Pubnub experiment for qcic

Decouple the parts:

## Simple
- publish heartbeat (interval)
- subscribe to heartbeat
```
npm start -- -s
npm start -- -p
npm start -- -p
```
## req-response

- subscribe to req responding with heartbeat payload
- publish req 