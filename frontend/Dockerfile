FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3030

ENV HOST=0.0.0.0
ENV PORT=3030

CMD ["npm", "start"]