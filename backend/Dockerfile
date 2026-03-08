# ---- Build ----
FROM rust:slim-bookworm AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN cargo build --release

# ---- Runtime ----
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/prediction-market-backend /app/server
COPY --from=builder /app/abi /app/abi
COPY --from=builder /app/migrations /app/migrations

EXPOSE 3001
CMD ["/app/server"]
