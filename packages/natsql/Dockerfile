# Best Dockerfile practices from Snyk
# https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/

# Build the image, in case we need build tools
# Is it ok to mix npm install in node:lts and use it in node:alpine?
FROM node:lts AS build  
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/
RUN npm ci --only=production

# --------------------------------------------------
# Production image
# To refresh the image
# - Find the latest lts alpine tag (like 18.17.1-alpine3.18)
# - Find the SHA: docker pull node:lts-alpine|grep Digest
# node:18.17.1-alpine3.18 == lts-alpine @ 2023-09-11
FROM node:18.17.1-alpine3.18@sha256:982b5b6f07cd9241c9ebb163829067deac8eaefc57cfa8f31927f4b18943d971

RUN apk --no-cache add dumb-init
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app

# Default port
EXPOSE 5000

CMD ["dumb-init", "node", "src/index.js"]

