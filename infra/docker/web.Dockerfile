FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_APP_BASE=/
ARG VITE_API_BASE=/api

COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm install

COPY . .

ENV VITE_APP_BASE=$VITE_APP_BASE
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build --workspace @karaoke/contracts \
  && npm run build --workspace @karaoke/ui \
  && npm run build --workspace @karaoke/web

EXPOSE 4173
CMD ["npm", "exec", "--workspace", "@karaoke/web", "--", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
