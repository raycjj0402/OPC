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

# ===== Stage 3: Production =====
FROM node:20-alpine
WORKDIR /app

# Fix OpenSSL for Prisma on Alpine
RUN apk add --no-cache openssl openssl-dev

# Copy backend build
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma
COPY backend/package*.json ./

# Copy frontend build into backend's public folder
COPY --from=frontend-builder /frontend/dist ./public

EXPOSE 4000

CMD ["sh", "-c", "echo '--- Environment Check ---' && echo \"DATABASE_URL is ${DATABASE_URL:+SET}${DATABASE_URL:-NOT SET}\" && if [ -z \"$DATABASE_URL\" ]; then echo 'ERROR: DATABASE_URL is not set. Please configure it in Railway Variables.' && exit 1; fi && echo 'Running prisma db push...' && npx prisma db push --accept-data-loss && echo 'Starting server...' && node dist/server.js"]
