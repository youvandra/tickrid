### Backend (Node.js + TypeScript) production image
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Default port (can be overridden by HTTP_PORT env var)
EXPOSE 4000

# In container, we rely on env vars from docker-compose (no --env-file).
CMD ["node", "dist/index.js"]
