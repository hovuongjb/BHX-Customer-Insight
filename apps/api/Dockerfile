FROM node:22-slim AS base
# Prisma's query engine needs OpenSSL, which node:*-slim does not ship.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
# src + tsconfig are kept so `npx tsx prisma/seed.ts` (which imports ../src) works inside the container.
COPY --from=base /app/src ./src
COPY --from=base /app/tsconfig.json ./tsconfig.json
COPY package.json ./
EXPOSE 4000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
