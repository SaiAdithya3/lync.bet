# ---- Build ----
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies (use --frozen-lockfile in CI if you have bun.lock committed)
COPY package.json bun.lock* ./
RUN bun install

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
