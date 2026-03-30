# Backend — Dockerfile

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy source
COPY server.js ./
COPY src/ ./src/

# Temp upload directory
RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "server.js"]
