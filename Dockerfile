# ===== Stage 1: Build Frontend =====
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ===== Stage 2: Build Backend =====
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ===== Stage 3: Production (Debian Slim - proper OpenSSL support) =====
FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy backend build
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma
COPY backend/package*.json ./

# Regenerate Prisma client for this OS
RUN npx prisma generate

# Copy frontend build into backend's public folder
COPY --from=frontend-builder /frontend/dist ./public

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 4000

CMD ["/start.sh"]
