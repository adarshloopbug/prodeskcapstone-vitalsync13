# Multi-stage production container for VitalSync Express Backend
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 5000

# Fulfills Phase 1 (P0): node server.js
CMD ["node", "server.js"]
