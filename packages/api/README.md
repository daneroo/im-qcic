# Nats GraphQL Bridge api server (with subscription)

[ ] Rename to natsql

This server is deployed at <https://natsql.dl.imetrical.com/>

It bridges GraphQL to NATS. For the moment, it bridges to a single (configurable) NATS subject: `im.qcic.heartbeat`. It is exposed as a Query, Mutation and Subscription.

It also serves REST routes for:

- `/`
- `/version`
- `/health`

This was once served from zeit, but it is no longer possible to run containers with persistent connection.

Deployed:

- [query](https://natsql.dl.imetrical.com/graphql?query=query%20%7B%0A%20%20messages%20%7B%0A%20%20%20%20id%0A%20%20%20%20stamp%0A%20%20%20%20host%0A%20%20%20%20text%0A%20%20%7D%0A%7D%0A)
- [subscription](https://natsql.dl.imetrical.com/graphql?operationName=OnNewMessage&query=subscription%20OnNewMessage%20%7B%0A%20%20newMessage%20%7B%0A%20%20%20%20id%0A%20%20%20%20stamp%0A%20%20%20%20host%0A%20%20%20%20text%0A%20%20%7D%0A%7D%0A)

## Example query, mutation and subscription

```bash
query {  messages { id stamp host text } }

mutation AddMessage {  addMessage(message: { stamp:"1970-01-01T00:00:00.000Z"    host:"browser", text:"ping" }) { id stamp host text }}

subscription OnNewMessage {  newMessage { id stamp host text }}
```

## Operations

## local

```bash
cd api
npm install
npm start
```

## Deploy

```bash
npm run deploy
npm run logs
```

### explicit now commands

```bash
now --public   # deploy
now alias      # aliases latest deployment (to our custom domain)
now rm --safe --yes api-qcic  # cleanup

# lookup first instance and tail -ts logs
now logs -f $(now ls api-qcic 2>/dev/null | tail +2 | head -1 |  awk '{print $2}')

open 'https://natsql.dl.imetrical.com/graphql?query=query%20%7B%0A%20%20messages%20%7B%0A%20%20%20%20id%0A%20%20%20%20stamp%0A%20%20%20%20host%0A%20%20%20%20text%0A%20%20%7D%0A%7D%0A'
```
