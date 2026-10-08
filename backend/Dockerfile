# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy TypeScript source files & config
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy database schema file for runtime references if needed
COPY src/db/schema.sql ./dist/db/schema.sql

# Expose Render application port
EXPOSE 5000

# Run container as secure non-root node user
USER node

# Start the Express & Socket.IO server
CMD ["node", "dist/index.js"]
