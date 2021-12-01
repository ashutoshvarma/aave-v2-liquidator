FROM node:lts-alpine

# Copy code to the image
WORKDIR /node/src/github.com/ashutoshvarma/moola-bot
COPY . .

RUN yarn install

# Run the app when the vm starts
CMD ["yarn", "start:prod"]
