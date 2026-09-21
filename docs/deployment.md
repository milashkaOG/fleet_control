# Развёртывание FleetControl

## 1. Требования

Для контейнерного запуска FleetControl необходимы:

- Git;
- Docker Desktop;
- Docker Compose.

Проверка:

```bash
docker --version
docker compose version
```

---

## 2. Архитектура

Docker Compose запускает два сервиса:

```text
FleetControl
│
├── app
│   └── Node.js / Express
│
└── postgres
    └── PostgreSQL 16
```

API публикуется на:

```text
http://localhost:3000
```

PostgreSQL доступен приложению через внутреннюю Docker-сеть.

---

## 3. Dockerfile

Приложение собирается на основе:

```text
node:22-alpine
```

Используемый Dockerfile:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations

EXPOSE 3000

CMD ["npm", "start"]
```

Для уменьшения build context используется `.dockerignore`.

---

## 4. Docker Compose

Основные сервисы:

- `app`;
- `postgres`.

PostgreSQL использует:

```text
postgres:16-alpine
```

Приложение подключается к БД по адресу:

```text
postgresql://fleetcontrol:fleetcontrol@postgres:5432/fleetcontrol
```

Внутри Docker Compose используется имя сервиса `postgres`, а не `localhost`.

Для PostgreSQL настроен healthcheck, поэтому приложение запускается только после готовности базы данных.

---

## 5. Миграции и seed

При запуске приложения автоматически выполняются:

```bash
npm run migrate
npm run seed
npm start
```

Миграции создают и обновляют структуру базы данных.

Seed загружает демонстрационные данные, необходимые для локального запуска и демонстрации системы.

---

## 6. Запуск

Сборка и запуск:

```bash
docker compose up --build
```

В фоновом режиме:

```bash
docker compose up -d --build
```

Проверка контейнеров:

```bash
docker compose ps
```

---

## 7. Проверка приложения

Healthcheck API:

```powershell
Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "http://localhost:3000/health"
```

Другие доступные endpoints:

```text
GET /vehicles
GET /drivers
POST /replacement-assignments
POST /replacement-assignments/:id/return
```

Проверить данные PostgreSQL можно напрямую:

```powershell
docker compose exec postgres psql `
    -U fleetcontrol `
    -d fleetcontrol
```

---

## 8. Persistent volume

PostgreSQL использует именованный volume:

```text
postgres_data
```

Поэтому команда:

```bash
docker compose down
```

удаляет контейнеры, но сохраняет данные.

После повторного:

```bash
docker compose up -d
```

БД остаётся доступной с ранее сохранёнными данными.

Для полного удаления контейнерного окружения вместе с БД:

```bash
docker compose down -v
```

---

## 9. Логи и диагностика

Логи приложения:

```bash
docker compose logs -f app
```

Логи PostgreSQL:

```bash
docker compose logs postgres
```

Если приложение не запускается:

```bash
docker compose ps
docker compose logs app
```

При ошибке подключения к БД необходимо проверить, что `DATABASE_URL` использует:

```text
@postgres:5432
```

а не `@localhost:5432`.

Если порт `3000` занят, необходимо остановить локальный Node.js-процесс или другой контейнер.

---

## 10. Управление окружением

Остановить и удалить контейнеры:

```bash
docker compose down
```

Только остановить:

```bash
docker compose stop
```

Повторно запустить:

```bash
docker compose start
```

Пересобрать после изменения Dockerfile или зависимостей:

```bash
docker compose up --build
```

---

## 11. Запуск с чистого окружения

Минимальный сценарий:

```bash
git clone <repository>
cd fleet_control
docker compose up --build
```

После запуска проверить:

```text
http://localhost:3000/health
```

Docker Compose самостоятельно поднимает PostgreSQL, выполняет миграции и seed и запускает FleetControl.