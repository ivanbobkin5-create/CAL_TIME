# Multi-stage Dockerfile for Timeweb Cloud & Production
FROM node:20-slim AS builder

WORKDIR /app

# OpenSSL is required by Prisma for database queries
# Using mirror-safe update with fallback, or node image pre-packaged tools
RUN apt-get update -y && apt-get install -y openssl ca-certificates || true

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev for building)
RUN npm ci

# Copy all source files
COPY . .

# Build Vite frontend + bundle backend server & seed into dist/
RUN npm run build

# Production runtime stage
FROM node:20-slim AS runner

WORKDIR /app

# Install openssl for Prisma runtime if needed
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/* || true

ENV NODE_ENV=production
ENV PORT=3000

# Copy package & prisma
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Generate Prisma Client for runtime
RUN npx prisma generate

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000

# Native Node.js Healthcheck (does NOT require curl!)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.cjs"]
