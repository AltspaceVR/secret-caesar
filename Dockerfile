FROM node:10.16-alpine
WORKDIR /opt/mre

COPY package*.json ./
RUN ["npm", "install", "--production", "--unsafe-perm"]

COPY static ./static/
COPY src/client/index.mustache ./src/client/index.mustache
COPY src/server ./src/server/

EXPOSE 3000/tcp
CMD ["npm", "start"]