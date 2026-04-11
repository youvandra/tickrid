# tickr.id

tickr.id is a hardware-connected market monitoring system with a fan-out backend (fetch once per pair, broadcast to all devices), a pairing/config web app, and an Arduino IDE sketch.

## Project structure

```
.
├─ backend/                 Node.js + TypeScript (HTTP + WebSocket)
├─ web/                     Next.js pairing + control panel
├─ arduino/hub75_panel      ESP32 + HUB75 (P5) LED matrix sketch (main display)
├─ arduino/hub75_hello      Minimal HUB75 “HELLO” test sketch
└─ docker-compose.yml       Postgres + Redis for local dev
```

## Local setup

### 1) Start Postgres + Redis

If you have Docker:

```bash
docker compose up -d
```

If you do not have Docker (macOS Homebrew):

```bash
brew install postgresql@16 redis
brew services start redis

# If brew services for Postgres works on your machine:
brew services start postgresql@16 || true

# If brew services fails (common on managed Macs), start Postgres manually:
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 -l /opt/homebrew/var/log/postgresql@16.log start

pg_isready -h localhost -p 5432
createdb tickr || true
psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='tickr'" postgres | grep -q 1 || psql postgres -c "CREATE ROLE tickr WITH LOGIN PASSWORD 'tickr';"
psql postgres -c "ALTER ROLE tickr CREATEDB;"
psql -c "ALTER DATABASE tickr OWNER TO tickr;" tickr
```

If you want Docker on macOS:

```bash
brew install --cask docker
open -a Docker
```

### 2) Configure environment variables

```bash
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local
```

Edit `backend/.env`:
- `POSTGRES_URL=postgres://tickr:tickr@localhost:5432/tickr`
- `REDIS_URL=redis://localhost:6379`
- `WEB_BASE_URL=http://localhost:3000`
- `TWELVE_DATA_API_KEY=...`

### 3) Install dependencies

```bash
npm install
```

### 4) Run backend

```bash
npm run dev -w backend
```

Backend endpoints:
- HTTP: `http://localhost:4000`
- Device WebSocket: `ws://localhost:4000/device`

### 5) Run web app

```bash
npm run dev -w web
```

Open:
- `http://localhost:3000/setup?device_id=TEST123`

## Arduino IDE (HUB75)

### 1) Configure WiFi + backend address

Open the folder `arduino/hub75_panel` in Arduino IDE. In `tickr_panel.ino`, edit:
- `WIFI_SSID`, `WIFI_PASS`
- `API_BASE` (your backend LAN IP, e.g. `http://172.20.10.7:4000`)
- `PAIR` (example: `BTC/USD`)
- HUB75 pin mapping if needed

Required libraries (install via Library Manager):
- ArduinoJson
- Adafruit GFX Library
- ESP32-HUB75-MatrixPanel-I2S-DMA

### 2) Build + flash

Select your ESP32 board in Tools, click Upload, then open Serial Monitor.

Device behavior:
- Top half shows ticker, last price, percent change, and interval
- Bottom half shows a chart (32 points → 64px width using 2px per point)
- Data is served from backend `/api/series` which pulls from TwelveData and caches in Redis

## Backend overview (fan-out)

Services are co-located by default (`SERVICE_ROLE=all`):
- WebSocket fan-out: subscribes to Redis `tickr:prices` and pushes updates to device sockets
- Market polling: reads `tickr:pair_counts`, fetches each active pair once per interval, caches and publishes prices

Key files:
- backend/src/index.ts
- backend/src/ws/deviceServer.ts
- backend/src/services/marketService.ts
