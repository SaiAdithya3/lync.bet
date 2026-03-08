# ---- Build ----
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Accept build-time env vars (set VITE_API_URL to your backend URL, e.g. https://api.lync.bet)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Build the app
COPY . .
RUN bun run build

# ---- Serve ----
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
