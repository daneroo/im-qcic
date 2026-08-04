# syntax=docker/dockerfile:1.7-labs
#
# Build context MUST be the v2/ workspace root, not this apps/ted1k-derive/
# directory - Bun needs the root package.json/bun.lock to resolve
# workspace:* links and catalog:* references (see infra/gateway/CONTEXT.md
# for the full note). Build from within v2/:
#   docker build -f apps/ted1k-derive/Dockerfile -t qcic-ted1k-derive:latest .
#
# Same multi-stage shape as apps/status/Dockerfile - see v2/AGENTS.md's
# Docker section for the established convention.

FROM oven/bun:1@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS base
WORKDIR /usr/src/app

# install dependencies into temp directories, scoped to this package -
# --filter keeps this scalable as more apps/ join the workspace. bun.lock
# now spans every apps/*/package.json (the workspace grew past status alone)
# - --frozen-lockfile validates the lockfile against the FULL set of
# manifests it was generated from, not just this package's, so every
# sibling's package.json must be present even though --filter only installs
# this one. COPY --parents (the "labs" syntax above) preserves each app's
# subdirectory while globbing them in one shot.
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY --parents apps/*/package.json /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile --filter '@daneroo/qcic-ted1k-derive'

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY --parents apps/*/package.json /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --filter '@daneroo/qcic-ted1k-derive'

# prerelease: copy source, run tests
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/apps/ted1k-derive/node_modules apps/ted1k-derive/node_modules
COPY apps/ted1k-derive apps/ted1k-derive
ENV NODE_ENV=production
RUN cd apps/ted1k-derive && bun test

# release: minimal production image. Runs source directly (bun executes
# TS natively) rather than a bundled dist/ output - matches oven/bun's
# own official Docker example, which does the same.
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/apps/ted1k-derive/node_modules apps/ted1k-derive/node_modules
COPY --from=prerelease /usr/src/app/apps/ted1k-derive/src apps/ted1k-derive/src
COPY --from=prerelease /usr/src/app/apps/ted1k-derive/package.json apps/ted1k-derive/package.json

ENV NODE_ENV=production
USER bun
WORKDIR /usr/src/app/apps/ted1k-derive
# No EXPOSE: headless background worker, no HTTP server - not a deviation
# from ADR-0003, just outside what it governs (see v2/AGENTS.md's Docker
# section, same carve-out apps/scast-bridge uses).

# Runtime credentials (gitignored, not baked into the image) mount at
# /usr/src/app/infra/credentials/ - mirrors the v2/infra/credentials/
# workspace convention 1:1 (config.ts reaches it via ../../infra/credentials/
# from WORKDIR):
#   -v .../v2/infra/credentials/credentials.mysql.json:/usr/src/app/infra/credentials/credentials.mysql.json
#   -v .../v2/infra/credentials/credentials.nats.json:/usr/src/app/infra/credentials/credentials.nats.json
ENTRYPOINT ["bun", "run", "src/index.ts"]
