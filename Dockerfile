# Single-service deployment: builds the frontend, then serves it from the
# same Express app that runs the API — one container, one URL, no CORS setup
# needed between frontend and backend. ffmpeg is installed here because the
# mock video provider shells out to it (a real video-generation provider
# would drop this requirement).

FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY backend/ ./
RUN mkdir -p storage/uploads storage/generated

COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
