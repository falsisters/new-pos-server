FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++ vips-dev vips-heif

WORKDIR /app

COPY . .

RUN yarn install --frozen-lockfile

RUN yarn build

FROM node:22-alpine AS runner

RUN apk add --no-cache vips-dev vips-heif

WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/startup.sh ./startup.sh

RUN chmod +x startup.sh

EXPOSE 3001

CMD ["./startup.sh"]
