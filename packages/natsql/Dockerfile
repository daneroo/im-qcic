FROM node:14

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock*.json /usr/src/app/

RUN npm ci
COPY . /usr/src/app

# TODO(daneroo): run as non root user

# Default port - should be a build arg or pick a better value
EXPOSE 5000

CMD [ "npm", "start" ]
