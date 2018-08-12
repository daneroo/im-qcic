# QCIC - Graphql subscription server and clients

Quis custodiet ipsos custodes - Who will watch the watchers

## TODO

- [] Move nats to `im-infra`, with `im-dd-client`.
- add `env.json` support to `ui/lib/config`
- add nats URL to `api/src/config`
- nats basic experiment
- [graphql-yoga to replace api - add express middleware](https://oss.prisma.io/content/GraphQL-Yoga/01-Overview.html)
- [gatsby](https://next.gatsbyjs.org/docs/gatsby-starters/)
  - https://gatsby-starter-personal-blog.greglobinski.com/
  - https://gatsby-starter-hero-blog.greglobinski.com/
  - https://github.com/Vagr9K/gatsby-material-starter
  - https://material-ui.com/premium-themes/
    - https://github.com/creativetimofficial/material-dashboard-react
    - https://github.com/creativetimofficial/material-kit/

- [Go/GraphQL](https://outcrawl.com/go-graphql-realtime-chat/)
- [AppSync and GraphQL](https://andrewgriffithsonline.com/blog/serverless-websockets-on-aws/)
- add topic to Message, for filtering
- Refactor MessageList Grapql HOC: withMessages
- ui styled jsx
  -Compare stock (git clone next.js/server/document.js) with our custom _document.js
  - _document.js:? [styled jsx on SSR](https://github.com/zeit/styled-jsx#server-side-rendering)

- ui About in markwon in material
- ui [About with Collapsible Cards](https://material-ui-next.com/demos/cards/)
- ui [devextreme Grid](https://devexpress.github.io/devextreme-reactive/react/grid/)
- logo with ω: ωωωω and http://snapsvg.io/
  - also favicon
  - ωho ωill ωatch the ωatchers
- npm outdated: ui: graphql, subscriptions-transport-ws
- npm outdated: server: graphql-tools
- scope packages to @imetrical/qcic...
- Figure out how to use '.' in now.sh aliases || deploy to imetrical.(com|net)
- cli: add yargs/commander --listen, --heartbeat,... options

##  ~~DONE~~
- ~~name change to im-wwww: keeping im-qcic~~
- ~~Header with Material, and remove global styles?)~~
- ~~ui [icons](https://material-ui-next.com/getting-started/installation/) npm install material-ui-icons~~
- ~~SendMessage Form to own Component (withData)~~
- ~~Rename components/withRoot -> lib/withMaterialRoot (only used in Page)~~
- ~~remove BasicTable/Dialog~~
- ~~ui with material~~
  - ~~reafactor getContext:styles from theme/palette~~
  - ~~with next.js/apollo - stale / refetch componentWillMount~~
  - ~~[move message to props](http://dev.apollodata.com/react/subscriptions.html#subscribe-to-more)~~
  - ~~with material-ui~~
- ~~remove client-app~~
- ~~add structure to Message (server/cli/withAppolo)~~
- ~~publish to zeit/now~~
- ~~remo babel from cli and server~~
- ~~cli client without babel~~
- ~~checkin package-lock.json~~
- ~~update npm version (client and server)~~
- ~~babel-preset-env now: please read babeljs.io/env to update~~
- ~~add node cli client~~

## k8s
gcloud bring up cluster:

```
gcloud auth login
gcloud config set project im-infra
gcloud components update

gcloud compute zones list # requires project..
gcloud config set compute/region northamerica-northeast1
gcloud config set compute/zone northamerica-northeast1-a

gcloud beta container --project "im-infra" clusters create "k1" --zone "us-central1-a" --username "admin" --cluster-version "1.9.7-gke.0" --machine-type "n1-standard-1" --image-type "COS" --disk-size "100" --scopes "https://www.googleapis.com/auth/compute","https://www.googleapis.com/auth/devstorage.read_only","https://www.googleapis.com/auth/logging.write","https://www.googleapis.com/auth/monitoring","https://www.googleapis.com/auth/servicecontrol","https://www.googleapis.com/auth/service.management.readonly","https://www.googleapis.com/auth/trace.append" --num-nodes "1" --network "default" --enable-cloud-logging --enable-cloud-monitoring --subnetwork "default" --addons HorizontalPodAutoscaling,HttpLoadBalancing,KubernetesDashboard --enable-autorepair

source <(kubectl completion bash)

watch kubectl get svc,deploy,po,pvc,ing,secrets,nodes

kubectl run hello-server --image gcr.io/google-samples/hello-app:1.0 --port 8080
kubectl expose deployment hello-server --type "LoadBalancer"
kubectl scale --replicas=3 deployment/hello-server

gcloud container clusters delete k1
```

## experiments
### nats
See `./nats/README.md`
### pubnub
See `./pubnub/README.md`

## cli client
See `./cli/README.md`

## ui client
See `./ui/README.md`

## api server
See `./api/README.md`


## References
- [https://dev-blog.apollodata.com/tutorial-graphql-subscriptions-server-side-e51c32dc2951](GraphQL Tutorial w/Subscriptions)
- [https://github.com/apollographql/graphql-subscriptions](graphql-subscriptions)
- [http://dev.apollodata.com/tools/](Apollo Tools Guide)
- Borrowed from [https://github.com/bmsantos/apollo-graphql-subscriptions-example](github.com/bmsantos/apollo-graphql-subscriptions-example)

