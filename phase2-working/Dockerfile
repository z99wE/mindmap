# ==========================================
# STAGE 1: Build Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install frontend dependencies
COPY src/frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY src/frontend/ ./
# Add dummy env vars required for Vite build if any
RUN npm run build

# ==========================================
# STAGE 2: Build Backend & Production Image
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# Set Node to production mode
ENV NODE_ENV=production

# Install backend dependencies
COPY package*.json ./
# Use ci with --omit=dev to keep the image small
RUN npm ci --omit=dev

# Copy backend source code
COPY server.js .
COPY package.json .
COPY orchestrator.js .
COPY src/ ./src/

# Copy built frontend assets from STAGE 1
COPY --from=frontend-builder /app/frontend/dist ./src/frontend/dist

# Expose the API port
EXPOSE 3001

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application securely (avoid running as root if possible, but keeping it simple here)
CMD ["node", "server.js"]
