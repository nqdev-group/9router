# 9Router Docker Build Guide

Tai lieu nay mo ta cach build va chay 9Router bang Docker dua tren cau hinh thuc te trong thu muc `docker/`.

## 1) Yeu cau

- Docker Desktop (Windows/Mac) hoac Docker Engine + Docker Compose plugin (Linux)
- Da clone repository

Kiem tra:

```bash
docker --version
docker compose version
```

## 2) Cau truc Docker hien tai

- File compose: `docker/docker-compose.yml`
- File bien moi truong cho compose: `docker/.env`
- Mau bien moi truong: `docker/.env.example`
- Docker image build tu root `Dockerfile` (multi-stage, Next standalone)
- Cong mac dinh: `20128`

Compose dang map volumes:

- `9router-data` -> `/app/data`
- `9router-usage` -> `/root/.9router`

## 3) Chay nhanh bang Docker Compose (khuyen nghi)

Tu thu muc goc du an:

```bash
docker compose -f ./docker/docker-compose.yml up -d --build --force-recreate --remove-orphans
```

Truy cap:

- Dashboard: http://localhost:20128/dashboard
- OpenAI-compatible API: http://localhost:20128/v1

Xem log:

```bash
docker compose -f ./docker/docker-compose.yml logs -f
```

Dung va xoa container/network (giu lai volumes):

```bash
docker compose -f ./docker/docker-compose.yml down --remove-orphans
```

Dung va xoa ca volumes:

```bash
docker compose -f ./docker/docker-compose.yml down -v --remove-orphans
```

## 4) Cau hinh bien moi truong

Compose dang su dung `env_file: .env` trong thu muc `docker/`, vi vay hay sua file:

- `docker/.env`

Toi thieu can doi trong moi truong production:

- `JWT_SECRET`
- `INITIAL_PASSWORD`
- `API_KEY_SECRET`

Neu app chay sau reverse proxy HTTPS, dat:

- `AUTH_COOKIE_SECURE=true`

## 5) Build va run thu cong (khong dung compose)

Build image tai root:

```bash
docker build -t nqdev/9router:latest .
```

Run container:

```bash
docker run -d \
	--name 9router \
	-p 20128:20128 \
	--env-file ./docker/.env \
	-v 9router-data:/app/data \
	-v 9router-usage:/root/.9router \
	nqdev/9router:latest
```

Lenh quan ly nhanh:

```bash
docker logs -f 9router
docker restart 9router
docker stop 9router
docker rm 9router
```

## 6) Cap nhat phien ban moi

```bash
docker compose -f ./docker/docker-compose.yml down --remove-orphans
docker compose -f ./docker/docker-compose.yml up -d --build --force-recreate --remove-orphans
```

Neu can reset du lieu hoan toan:

```bash
docker compose -f ./docker/docker-compose.yml down -v --remove-orphans
docker volume rm 9router_9router-data 9router_9router-usage 2>/dev/null || true
```

Luu y: ten volume thuc te co the duoc prefix theo ten project compose.

## 7) Kiem tra suc khoe sau khi chay

Kiem tra container:

```bash
docker ps --filter name=9router
```

Kiem tra endpoint models:

```bash
curl http://localhost:20128/v1/models
```

Neu dung PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:20128/v1/models" -Method Get
```

## 8) Loi thuong gap

1. Port 20128 bi trung

- Doi mapping port trong `docker/docker-compose.yml`, vi du `30128:20128`.

2. Dang nhap khong thanh cong sau khi doi mat khau

- Kiem tra `INITIAL_PASSWORD` trong `docker/.env`.
- Neu da co du lieu cu trong volume, gia tri nay co the khong con duoc ap dung.

3. Cookie auth bi mat khi chay HTTPS

- Dat `AUTH_COOKIE_SECURE=true` khi truy cap qua HTTPS.

4. Du lieu khong ghi duoc

- Kiem tra volume da duoc mount dung (`/app/data`).
- Xem logs container de kiem tra loi permission.

## 9) Lenh nhanh cho Windows (PowerShell)

```powershell
# Start
$env:VERSION="0.4.46"; docker compose -f .\docker\docker-compose.yml up -d --build --force-recreate --remove-orphans

# Logs
docker compose -f .\docker\docker-compose.yml logs -f

# Stop + remove container/network
docker compose -f .\docker\docker-compose.yml down --remove-orphans

# Stop + remove all including volumes
docker compose -f .\docker\docker-compose.yml down -v --remove-orphans
```

## 10) Docker build image

```powershell
# Build 1 service cụ thể
docker-compose -f docker/docker-compose.yml build <service_name>

# Build không cache
$env:VERSION="0.4.46"; docker compose -f .\docker\docker-compose.yml build --no-cache

# Build + xem log chi tiết
$env:VERSION="0.4.46"; docker compose -f .\docker\docker-compose.yml build --progress=plain

# Tag image local thành latest
docker tag nqdev/9router:0.4.46 nqdev/9router:latest

# Push image lên Docker Hub
docker push nqdev/9router:0.4.46
docker push nqdev/9router:latest
```

### Inline build, tag, and push Docker images

```powershell
# Inline build, tag, and push Docker images
$env:VERSION="0.4.46"

# Build image
docker-compose -f .\docker\docker-compose.yml build --no-cache
if ($?) {
    # Tag image
    docker tag nqdev/9router:$env:VERSION nqdev/9router:latest

    # Push versioned image
    docker push nqdev/9router:$env:VERSION

    # Push latest image
    docker push nqdev/9router:latest
} else {
    Write-Host "Build failed, stopping script."
    exit 1
}
```

### Fixbug and build image

```powershell
# Build + xem log chi tiết
$env:VERSION="0.4.46.003"; docker compose -f .\docker\docker-compose.yml build --progress=plain

# Push image lên Docker Hub
docker push nqdev/9router:0.4.46.003
```
