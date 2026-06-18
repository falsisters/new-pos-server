FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++ vips-dev vips-heif

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:22-alpine AS runner

RUN apk add --no-cache vips-dev vips-heif

WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main.js"]
