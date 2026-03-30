# Storage node — Dockerfile
# Minimal Node.js 20 image to keep the image size small.

FROM node:20-alpine

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package.json ./
RUN npm install --production

# Copy application code
COPY server.js ./

# Chunk data directory (will be mounted as a Docker volume)
RUN mkdir -p /app/data

EXPOSE 4001

CMD ["node", "server.js"]
