# Cloud Run example (node)

Deploying a serverless container with Cloud Run.

Using `imetrical.com` projectId `cloudrun-237421`

- Only runs in `us-central1` for now.

## TODO

- Rename to myip
- deploy with name
- clean repo's and versions of services

## Cloud Build & deploy

```bash
make build
make deploy
```

tl;dr

```bash
# set region
gcloud config set run/region us-central1

#build
gcloud builds submit --tag gcr.io/cloudrun-237421/helloworld

#deploy
gcloud beta run deploy --image gcr.io/cloudrun-237421/helloworld
```

## References

Doing [this tutorial](https://cloud.google.com/run/docs/quickstarts/build-and-deploy).