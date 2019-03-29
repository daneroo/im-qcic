FROM node:11

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock*.json /usr/src/app/

# remove now later
RUN npm i -g --unsafe-perm now
RUN npm ci
COPY . /usr/src/app

# TODO:daneroo run as non root user

# Default port
# EXPOSE 8000

# CMD [ "npm", "start" ]
CMD [ "npm", "run", "cron" ]
