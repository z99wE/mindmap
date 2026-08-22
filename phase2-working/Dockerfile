# ==========================================
# STAGE 1: Build Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Install frontend dependencies
COPY src/frontend/package*.json ./src/frontend/
RUN cd src/frontend && npm install

# Copy frontend source and build
COPY src/frontend/ ./src/frontend/
RUN cd src/frontend && npm run build

# ==========================================
# STAGE 2: Build Backend & Production Image
# ==========================================
FROM node:22-alpine AS production

WORKDIR /app

# Set Node to production mode
ENV NODE_ENV=production

# Install backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY server.js ./
COPY package.json ./
COPY orchestrator.js ./
COPY memory-graph.js ./
COPY agent-reach-integration.js ./
COPY src/ ./src/
COPY features/ ./features/

# Copy built frontend assets from STAGE 1
COPY --from=frontend-builder /app/src/frontend/dist ./src/frontend/dist

# Expose the API port
EXPOSE 3001

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
