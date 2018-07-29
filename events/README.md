# Severless(.com) Event Gateway
See https://serverless.com/event-gateway/

Deployed using `im-dan` credentials from shannon
and credential from eventgateway (in .gitignored `CREDS` file)

```
git clone https://github.com/serverless/event-gateway-getting-started.git
cd event-gateway-getting-started
npm install
npm install -g serverless

serverless deploy

serverless remove
```

```
APP=daneroo-qcic.slsgateway.com
curl -s -X POST -H "Content-Type: application/json" https://${APP}/users         --data '{
        "id": "10",
        "firstName": "Donald",
        "lastName": "Duck",
        "email": "donald.duck@disney.com"
        }' | jq .

curl -s -X GET https://${APP}/users/10 | jq .

sls logs -f addUserToCRM

sls gateway emit --event "user.created" --data "$(cat event.json)"

sls logs -f addUserToCRM

```