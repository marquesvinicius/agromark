FROM node:20-slim AS builder

WORKDIR /app

# Instala o OpenSSL para garantir compatibilidade com o Prisma
RUN apt-get update && apt-get install -y openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run prisma:generate

FROM node:20-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# Instala o OpenSSL para garantir compatibilidade com o Prisma
RUN apt-get update && apt-get install -y openssl

COPY --from=builder /app /app

RUN npm prune --production

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]


