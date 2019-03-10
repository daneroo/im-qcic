# GraphQL api server (with sunbsripction

This api is deployed on zeit/now using our custom (externam domain).

Deployed:
- [query](https://api.qcic.n.imetrical.com/graphql?query=query%20%7B%0A%20%20messages%20%7B%0A%20%20%20%20id%0A%20%20%20%20stamp%0A%20%20%20%20host%0A%20%20%20%20text%0A%20%20%7D%0A%7D%0A)
- [subscription](https://api.qcic.n.imetrical.com/graphql?operationName=OnNewMessage&query=subscription%20OnNewMessage%20%7B%0A%20%20newMessage%20%7B%0A%20%20%20%20id%0A%20%20%20%20stamp%0A%20%20%20%20host%0A%20%20%20%20text%0A%20%20%7D%0A%7D%0A)

## Deploy (zeit/now)
Deployment is configured with `now.json`
```
npm run deploy
npm run logs
```

## Example query, mutation and subscription:
```
query {  messages { id stamp host text } }

mutation AddMessage {  addMessage(message: { stamp:"1970-01-01T00:00:00.000Z"    host:"browser", text:"ping" }) { id stamp host text }}

subscription OnNewMessage {  newMessage { id stamp host text }}
```

## Operations

## local
```
cd api
npm install
npm start
```
## Deploy
```
npm run deploy
npm run logs
```
### explicit now commands
```
now --public   # deploy
now alias      # aliases latest deploymen ( to our custom domaint
now rm --safe --yes api-qcic  # cleanup

# lookup first istance and tail -ts logs
now logs -f $(now ls api-qcic 2>/dev/null | tail +2 | head -1 |  awk '{print $2}')

open 'https://api.qcic.n.imetrical.com/graphql?query=query%20%7B%0A%20%20messages%20%7B%0A%20%20%20%20id%0A%20%20%20%20stamp%0A%20%20%20%20host%0A%20%20%20%20text%0A%20%20%7D%0A%7D%0A'
```
