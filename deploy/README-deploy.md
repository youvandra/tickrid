# Panduan deploy (VPS + Docker)

Repo ini berisi:
- **backend**: Node.js + TypeScript (Express + WebSocket) default port **4000**
- **web**: Next.js 15 default port **3000** (client akses API via **/api/**, dan server Next akan memanggil backend lewat env `BACKEND_INTERNAL_URL`)
- **postgres** + **redis**

Di folder `deploy/` sudah saya siapkan contoh file untuk production:
- `docker-compose.prod.yml` (app + nginx HTTP)
- `docker-compose.caddy.yml` + `Caddyfile` (**HTTPS otomatis** – direkomendasikan)
- `.env.prod.example`

## 1) Persiapan VPS
1. Pastikan domain kamu sudah diarahkan ke IP VPS (A record).
2. Install Docker + Compose plugin (Ubuntu):
   - Ikuti dokumentasi resmi Docker (cara paling aman/standar).
3. Buka firewall:
   - minimal **80**
   - jika pakai HTTPS: **443**

## 2) Siapkan file environment (secrets)
Di server, dari root repo:
```bash
cp deploy/.env.prod.example deploy/.env.prod
nano deploy/.env.prod
```

Wajib kamu ganti:
- `POSTGRES_PASSWORD`
- `ADMIN_API_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET`
- `WEB_BASE_URL` dan `CORS_ORIGINS` ke domain kamu (pakai https kalau sudah SSL)

## 3) Opsi A (Direkomendasikan): Reverse proxy pakai Caddy (HTTPS otomatis)
1. Edit `deploy/Caddyfile`, ganti `example.com` → domain kamu.
2. Jalankan:
```bash
docker compose \
  --env-file deploy/.env.prod \
  -f deploy/docker-compose.prod.yml \
  -f deploy/docker-compose.caddy.yml \
  up -d --build
```

Catatan:
- Caddy akan otomatis request sertifikat Let’s Encrypt. Pastikan port 80/443 terbuka & domain sudah benar.

## 4) Opsi B: Reverse proxy pakai Nginx (HTTP dulu)
Jalankan:
```bash
docker compose \
  --env-file deploy/.env.prod \
  -f deploy/docker-compose.prod.yml \
  up -d --build
```

Ini akan publish **HTTP** di port 80. Untuk HTTPS ada beberapa opsi:
- pakai Caddy (Opsi A) — paling simpel
- pakai Cloudflare (SSL di edge)
- atau setup Nginx+Certbot (lebih ribet kalau Nginx ada di container)

## 5) Cek apakah service sudah jalan
```bash
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs -f --tail=200 web
docker compose -f deploy/docker-compose.prod.yml logs -f --tail=200 backend
```

## 6) Endpoint penting
- Web: `https://<domain>/`
- Web API (Next route handlers): `https://<domain>/api/...`
- WebSocket device: `wss://<domain>/device`

## 7) Tips production
- Jangan expose port Postgres/Redis ke publik (di compose ini memang tidak di-publish).
- Backup volume Postgres (`tickr_postgres`) secara berkala.
- Putar secret (`ADMIN_API_KEY`, `ADMIN_JWT_SECRET`) jika bocor.
