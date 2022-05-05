FROM node:18

WORKDIR /usr/src/app

COPY . .

RUN mv .env .env; exit 0

RUN npm install

EXPOSE 3000

CMD [ "npm", "start" ]