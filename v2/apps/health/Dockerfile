# syntax=docker/dockerfile:1.7-labs
#
# Build context MUST be the v2/ workspace root. Build from within v2/:
#   docker build -f apps/health/Dockerfile -t qcic-health:latest .

FROM oven/bun:1@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY --parents apps/*/package.json /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile --filter '@daneroo/qcic-health'

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY --parents apps/*/package.json /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --filter '@daneroo/qcic-health'

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/apps/health/node_modules apps/health/node_modules
COPY apps/health apps/health
ENV NODE_ENV=production
RUN cd apps/health && bun test

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/apps/health/node_modules apps/health/node_modules
COPY --from=prerelease /usr/src/app/apps/health/src apps/health/src
COPY --from=prerelease /usr/src/app/apps/health/package.json apps/health/package.json

ENV NODE_ENV=production
USER bun
WORKDIR /usr/src/app/apps/health
EXPOSE 8000

ENTRYPOINT ["bun", "run", "src/index.ts"]
