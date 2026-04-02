FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

EXPOSE 4000

# Run migrations then start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx ts-node src/utils/seed.ts && node dist/server.js"]
