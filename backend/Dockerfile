# Veiled API server
FROM node:20-slim

# better-sqlite3 needs build tools for its native module
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# Persist DB + uploads on a volume in production:
#   docker run -v veiled-data:/data -e DB_PATH=/data/veiled.db -e UPLOAD_DIR=/data/uploads ...
EXPOSE 3000

CMD ["node", "server.js"]
