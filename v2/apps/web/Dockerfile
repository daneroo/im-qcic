# syntax=docker/dockerfile:1.7-labs
#
# Build context MUST be the v2/ workspace root. Build from within v2/:
#   docker build -f apps/web/Dockerfile -t qcic-web:latest .
#
# No VITE_* build args: the production bundle reaches NATS and /healthz on
# the page's own origin (src/endpoints.ts), whatever name serves it.

FROM oven/bun:1@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY --parents apps/*/package.json /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile --filter '@daneroo/qcic-web'

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY --parents apps/*/package.json /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --filter '@daneroo/qcic-web'

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/apps/web/node_modules apps/web/node_modules
COPY apps/web apps/web
ENV NODE_ENV=production
RUN cd apps/web && bun test && bun run build

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/apps/web/node_modules apps/web/node_modules
COPY --from=prerelease /usr/src/app/apps/web/dist apps/web/dist
COPY --from=prerelease /usr/src/app/apps/web/serve.ts apps/web/serve.ts
COPY --from=prerelease /usr/src/app/apps/web/package.json apps/web/package.json

ENV NODE_ENV=production
USER bun
WORKDIR /usr/src/app/apps/web
EXPOSE 8000

ENTRYPOINT ["bun", "run", "serve.ts"]
