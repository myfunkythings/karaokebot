FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm install

COPY . .

RUN npm run prisma:generate \
  && npm run build --workspace @karaoke/contracts \
  && npm run build --workspace @karaoke/api

EXPOSE 3000
CMD ["npm", "run", "start:prod", "--workspace", "@karaoke/api"]
