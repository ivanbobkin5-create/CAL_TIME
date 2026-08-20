# Multi-stage Dockerfile optimized for Timeweb Cloud & Production
FROM node:20-slim AS builder

WORKDIR /app

# Install required system packages for Prisma and native modules
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ && \
    rm -rf /var/lib/apt/lists/* || true

# Copy configuration and schema files
COPY package*.json ./
COPY .npmrc ./
COPY prisma ./prisma/

# Install all dependencies safely
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Generate Prisma Client & Build Vite + bundle backend server & seed
RUN npx prisma generate
RUN npm run build

# Production runtime stage
FROM node:20-slim AS runner

WORKDIR /app

# Install OpenSSL for Prisma engine in runtime
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/* || true

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY .npmrc ./
COPY prisma ./prisma/

# Install production dependencies
RUN npm install --omit=dev --legacy-peer-deps
RUN npx prisma generate

# Copy built bundles from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000

# Native Node.js Healthcheck (no external curl needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.cjs"]
