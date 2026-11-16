# Optimized Production Dockerfile without external apt-get network calls
FROM node:20-alpine AS builder

WORKDIR /app

# In alpine, OpenSSL and ca-certificates are already available or standard
COPY package*.json ./
COPY .npmrc ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application sources
COPY . .

# Generate Prisma Client & Build Vite + bundle backend server & seed
RUN npx prisma generate
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY .npmrc ./
COPY prisma ./prisma/

# Install production dependencies
RUN npm install --omit=dev --legacy-peer-deps
RUN npx prisma generate

# Copy build artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000

# Native Node.js Healthcheck (zero dependency)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.cjs"]
