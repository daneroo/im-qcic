# Cloudrun

The deployed Google Cloud Run implementation of "myip" — a service that echoes the caller's IP back as JSON.

## Language

**Myip**:
The caller's-IP-echo service concept. Currently deployed from this directory (`cloudrun/index.js`) at `https://myip.g.imetrical.com`, GCP project `qcic-237620`, region `us-central1`. `packages/myip` is an undeployed rewrite meant to eventually replace this directory (see README TODO: "bless, update deps, and publish to gcloud run") — until that ships, `cloudrun/` is the live one.
_Avoid_: confusing this with `packages/myip`, which is not yet deployed

**Note**: this README's intro line names project `cloudrun-237421`, but the Makefile and deploy commands use `qcic-237620` — the latter is confirmed live (matches the deployed endpoint); the former looks like stale/abandoned doc text.
