# QCIC - Graphql subscription server and clients

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

> Quis custodiet ipsos custodes - Who will watch the watchers

This monorepo gathers concerns about the declarative and observed state of my homelab.

## TODO

- move `gateway` to d1-px1 (already cloned),
  - or it's own vm; DNS update?
- Repo cleanup
  - deprecate top level - (after replacing or moving if necessary)
    - [ ] `cloudrun/`: Google Cloud Run deployment of <https://myip.g.imetrical.com/>
      - Better version in
    - [ ] `events/`: Severless(.com) Event Gateway
    - [ ] `fio/`: Fio Tests, should move to `scripts/`
    - [ ] `k8s/`: Kubernetes experiments, should move to `experiments/` or legacy?
    - [ ] `mail/`: Mailgun experiments, alternative notification, move to `scripts/`?
      - validated api_key, domain, and stored in 1Password
    - [ ] `nats/`: move to scripts, nats-top -s nats.ts.imetrical.com
    - [ ] `s3/`: move to docs/scripts - was a key rotation experiment for s3-db/pubnub
    - [ ] `pubnub/`: delete
      - Delete AWS S3 buckets (im-dan account / qcic-s3-rw user with access key ):
  - `packages`
    - [ ] `ui`: delete: garbage ancient next.js app with nats/gql-apollo
    - [ ] `react`: delete: reusable pika-pack components useFetch, FetchInterval,...
    - [ ] `myip`: bless, update deps, and publish to gcloud run
    - [ ] complete reviewing other packages
- See TODO legacy and done below

## Scripts

This is the beginning of the revamping of the mono repo.

- Start with bash for planning
- Upgrade to `dax` | `zx` | `go` | `nix`
- qcic.sh

## Infra

In `./infra` we handle deployment of the `qcic` related resources.

- Deployed to `gateway.imetrical.com`
  - caddy (See `./infra/README.md` and `./infra/config/caddy/Caddyfile` for details)
  - nats
  - natsql
  - status
  - ddclient (REMOVED 2023-09-11)

## Operating

```bash
lerna bootstrap  # no --hoist for now
# yarn fix for docz:
(cd packages/docz; npm run fix)
npm test
npm run unit  # no audit or lint

# bump the version of affected packages (commits and tags repo - asks for confirmation)
lerna version patch
```

## Adding New Package

```bash
lerna create @daneroo/qcic-thing # then rename to packages/thing
lerna add jest --dev
lerna add standard --dev
```

- Copy `scripts`,`standard,`jest` sections from appropriate template package
- Adjust package.json if not published to npm

```js
...
  "private": true,
  "//publishConfig": {
    "access": "public"
  },
...
```

## TODO Legacy

- lerna + tsdx|microbundle

  - [tsdx mopnorepo starter](https://github.com/jaredpalmer/tsdx-monorepo)
  - clone site to nextra
  - hint tsdx uses nextra, and nextra is a monorepo (core branch, not master)
    - nextra uses microbundle for the nextra package
  - clone site to docusaurus

- imetrical.net: LetsEncrypt: Using Caddy/Traefik

  - DNS Pricing AWS:R53:0.50/mo GCP:CloudDNS:0.20/mo Cloudflare: free?
  - History: myip.taurus.k.xrobots.dev
  - [Caddy docker](https://hub.docker.com/_/caddy)
  - Both Caddy and Traefik use [lego](https://github.com/go-acme/lego)
  - [Caddy DNS Challenge](https://caddyserver.com/docs/automatic-https#dns-challenge)
    - [caddy-dns/route53](https://github.com/caddy-dns/route53)
    - [caddy-dns/googleclouddns](https://github.com/caddy-dns/googleclouddns)
    - [caddy-dns/cloudflare](https://github.com/caddy-dns/cloudflare)
  - [Traefik DNS Challenge](https://doc.traefik.io/traefik/v1.7/configuration/acme/#dnschallenge)

- Use [macdriver for MacOS Toolbar status](https://github.com/progrium/macdriver)
- npx create-react-library for qcic-react
- Using Chakra-ui with Shared Nav Header
- clean up and resync

  - docz - mdx docs / including this TODO
  - mdx-deck ?
  - instructions for operating/deploying
  - lerna

- add `env.json` support to `ui/lib/config`
- add nats URL to `api/src/config`
- nats basic experiment
- [graphql-yoga to replace api - add express middleware](https://oss.prisma.io/content/GraphQL-Yoga/01-Overview.html)
- [gatsby](https://next.gatsbyjs.org/docs/gatsby-starters/)

  - <https://gatsby-starter-personal-blog.greglobinski.com/>
  - <https://gatsby-starter-hero-blog.greglobinski.com/>
  - <https://github.com/Vagr9K/gatsby-material-starter>
  - <https://material-ui.com/premium-themes/>
    - <https://github.com/creativetimofficial/material-dashboard-react>
    - <https://github.com/creativetimofficial/material-kit/>

- [Go/GraphQL](https://outcrawl.com/go-graphql-realtime-chat/)
- [AppSync and GraphQL](https://andrewgriffithsonline.com/blog/serverless-websockets-on-aws/)
- add topic to Message, for filtering
- Refactor MessageList Graphql HOC: withMessages
- ui styled jsx
  -Compare stock (git clone next.js/server/document.js) with our custom \_document.js

  - \_document.js:? [styled jsx on SSR](https://github.com/zeit/styled-jsx#server-side-rendering)

- ui About in markdown in material
- ui [About with Collapsible Cards](https://material-ui-next.com/demos/cards/)
- ui [Dev Extreme Grid](https://devexpress.github.io/devextreme-reactive/react/grid/)
- logo with ω: ωωωω and <http://snapsvg.io/>
  - also favicon
  - who will watch the watchers
- npm outdated: ui: graphql, subscriptions-transport-ws
- npm outdated: server: graphql-tools
- scope packages to @imetrical/qcic...
- Figure out how to use '.' in now.sh aliases || deploy to imetrical.(com|net)
- cli: add yargs/commander --listen, --heartbeat,... options

### ~~DONE~~

- ~~name change to im-wwww: keeping im-qcic~~
- ~~Header with Material, and remove global styles?)~~
- ~~ui [icons](https://material-ui-next.com/getting-started/installation/) npm install material-ui-icons~~
- ~~SendMessage Form to own Component (withData)~~
- ~~Rename components/withRoot -> lib/withMaterialRoot (only used in Page)~~
- ~~remove BasicTable/Dialog~~
- ~~ui with material~~
  - ~~refactor getContext:styles from theme/palette~~
  - ~~with next.js/apollo - stale / refetch componentWillMount~~
  - ~~[move message to props](http://dev.apollodata.com/react/subscriptions.html#subscribe-to-more)~~
  - ~~with material-ui~~
- ~~remove client-app~~
- ~~add structure to Message (server/cli/withApollo)~~
- ~~publish to zeit/now~~
- ~~remove babel from cli and server~~
- ~~cli client without babel~~
- ~~check in package-lock.json~~
- ~~update npm version (client and server)~~
- ~~babel-preset-env now: please read <https://babeljs.io/env> to update~~
- ~~add node cli client~~

## Components

### nats

See `./nats/README.md`

Start the shared nats instance, as well as test client code

### pubnub

See `./pubnub/README.md`

### cli client

See `./cli/README.md`

### ui client

See `./ui/README.md`

### api server

See `./api/README.md`

## K8S

gcloud bring up cluster:

```bash
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

## References

- [GraphQL Tutorial w/Subscriptions](https://dev-blog.apollodata.com/tutorial-graphql-subscriptions-server-side-e51c32dc2951)
- [graphql-subscriptions](https://github.com/apollographql/graphql-subscriptions)
- [Apollo Tools Guide](http://dev.apollodata.com/tools/)
- Borrowed from <https://github.com/bmsantos/apollo-graphql-subscriptions-example>
