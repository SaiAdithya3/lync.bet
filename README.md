# Chainlink-hackathon

## Local Development Setup

### 1. Start PostgreSQL (Docker)

```bash
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with:
- **User**: postgres
- **Password**: postgres
- **Database**: prediction_market

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env: add your BACKEND_PRIVATE_KEY (wallet for fillOrder/createMarket)

cargo run
```

The backend runs migrations on startup and listens on port 3001.

### 3. Watcher (optional)

```bash
cd watcher
cp .env.example .env
cargo run
```

### Alternative: PostgreSQL without Docker

If you have PostgreSQL installed locally:

```bash
createdb prediction_market
```

Then use `DATABASE_URL=postgresql://localhost:5432/prediction_market` (adjust user/password if needed).
