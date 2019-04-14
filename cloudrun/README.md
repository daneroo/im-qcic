# Cloud Run example (node)

Deploying a serverless container with Cloud Run.

Using `imetrical.com` projectId `cloudrun-237421`

- Only runs in `us-central1` for now.

Because cloud run containers are running in gVisor, and seem to be checkpointed/restored, it seems like I can't get anything unique out of the container instance:

- `const hostuid = require('ulid').ulid()`: is noly evaluated once???
- `hostname` is always localhost
- `require('os').networkInterfaces()` is useless (gVisor isolation)

## TODO

- clean services revisions
- [clean registry images](https://cloud.google.com/container-registry/docs/managing)

## Cloud Build & deploy

See `Makefile` for settings for memory, concurrency,..
Concurrency is set to 80, which is the default and maximum

```bash
make build
make deploy
make smoke
```

## Setup

```bash
# set region and project
gcloud config set project qcic-237620
gcloud config set run/region us-central1
```

## References

Doing [this tutorial](https://cloud.google.com/run/docs/quickstarts/build-and-deploy).