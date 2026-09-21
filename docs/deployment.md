# Развёртывание FleetControl

## 1. Назначение документа

Документ описывает процесс локального контейнерного развёртывания FleetControl с использованием Docker и Docker Compose.

Контейнерное окружение предназначено для воспроизводимого запуска:

- серверного приложения FleetControl;
- PostgreSQL;
- миграций базы данных;
- демонстрационных данных.

После подготовки окружения система запускается одной командой Docker Compose.

---

## 2. Требования

Для запуска необходимы:

- Git;
- Docker Desktop;
- Docker Compose.

Для проверки установки Docker:

```bash
docker --version
```

Проверка Docker Compose:

```bash
docker compose version
```

На Windows Docker Desktop использует WSL2.

---

## 3. Состав контейнерного окружения

Docker Compose запускает два основных сервиса:

```text
FleetControl
│
├── app
│   └── Node.js / Express
│
└── postgres
    └── PostgreSQL 16
```

Приложение и PostgreSQL находятся в общей внутренней Docker-сети.

С хостовой системы наружу публикуется порт приложения:

```text
localhost:3000
```

PostgreSQL не обязан публиковать порт `5432` наружу, поскольку приложение подключается к нему через внутреннюю сеть Docker.

---

## 4. Dockerfile

Для сборки приложения используется файл:

```text
Dockerfile
```

Конфигурация:

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

В качестве базового образа используется:

```text
node:22-alpine
```

Образ Alpine выбран для уменьшения размера runtime-контейнера.

Сначала копируются `package.json` и `package-lock.json`, после чего выполняется:

```bash
npm ci --omit=dev
```

Это позволяет устанавливать только зависимости, необходимые для запуска приложения.

После этого копируются:

- исходный код;
- скрипты миграции и seed;
- миграции базы данных.

---

## 5. `.dockerignore`

Файл `.dockerignore` исключает ненужные файлы из Docker build context.

Пример:

```text
node_modules
npm-debug.log
.git
.github
.env
coverage
docs
tests
README.md
```

Локальный `.env` не копируется внутрь Docker image.

Переменные окружения контейнеров задаются через Docker Compose.

---

## 6. Docker Compose

Для запуска используется:

```text
docker-compose.yml
```

Конфигурация содержит сервисы:

- `postgres`;
- `app`.

Пример конфигурации:

```yaml
services:
  postgres:
    image: postgres:16-alpine

    environment:
      POSTGRES_USER: fleetcontrol
      POSTGRES_PASSWORD: fleetcontrol
      POSTGRES_DB: fleetcontrol

    volumes:
      - postgres_data:/var/lib/postgresql/data

    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U fleetcontrol -d fleetcontrol
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build:
      context: .
      dockerfile: Dockerfile

    environment:
      PORT: 3000
      DATABASE_URL: postgresql://fleetcontrol:fleetcontrol@postgres:5432/fleetcontrol

    ports:
      - "3000:3000"

    depends_on:
      postgres:
        condition: service_healthy

    command: >
      sh -c "
      npm run migrate &&
      npm run seed &&
      npm start
      "

volumes:
  postgres_data:
```

---

## 7. Подключение приложения к PostgreSQL

При локальном запуске вне Docker может использоваться:

```text
postgresql://fleetcontrol:fleetcontrol@localhost:5432/fleetcontrol
```

В Docker Compose `localhost` использовать нельзя, поскольку внутри контейнера `localhost` означает сам контейнер приложения.

Для обращения к PostgreSQL используется имя Compose-сервиса:

```text
postgres
```

Поэтому контейнерная строка подключения имеет вид:

```text
postgresql://fleetcontrol:fleetcontrol@postgres:5432/fleetcontrol
```

Docker автоматически предоставляет DNS-разрешение имени `postgres` внутри Compose-сети.

---

## 8. Healthcheck PostgreSQL

Перед запуском приложения необходимо убедиться, что PostgreSQL уже готов принимать соединения.

Для этого используется:

```yaml
healthcheck:
  test:
    - CMD-SHELL
    - pg_isready -U fleetcontrol -d fleetcontrol
```

Приложение зависит от:

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

Таким образом, запуск приложения происходит только после перехода PostgreSQL в состояние healthy.

---

## 9. Миграции базы данных

При запуске контейнера приложения выполняется:

```bash
npm run migrate
```

Команда запускает:

```text
scripts/migrate.js
```

Миграции позволяют последовательно формировать структуру базы данных и хранить изменения схемы в системе контроля версий.

Миграции являются повторяемыми: уже выполненные изменения повторно не применяются.

---

## 10. Демонстрационные данные

После миграций автоматически выполняется:

```bash
npm run seed
```

Seed используется для загрузки демонстрационных данных.

В тестовом окружении создаются, в частности:

- автомобили;
- водители.

Seed предназначен для подготовки воспроизводимого демонстрационного окружения.

---

## 11. Запуск системы

Находясь в корне репозитория, выполнить:

```bash
docker compose up --build
```

Команда:

1. собирает Docker image FleetControl;
2. создаёт PostgreSQL-контейнер;
3. создаёт persistent volume;
4. ожидает готовности PostgreSQL;
5. запускает миграции;
6. выполняет seed;
7. запускает Node.js-приложение.

Для запуска в фоновом режиме:

```bash
docker compose up -d --build
```

---

## 12. Проверка состояния контейнеров

Для просмотра запущенных сервисов:

```bash
docker compose ps
```

Ожидается наличие:

```text
app
postgres
```

PostgreSQL должен находиться в состоянии healthy.

---

## 13. Проверка `/health`

После запуска приложения выполнить:

```powershell
Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "http://localhost:3000/health"
```

Ожидается HTTP:

```text
200 OK
```

Пример ответа:

```json
{
  "status": "ok",
  "service": "FleetControl",
  "version": "0.2.1"
}
```

Номер версии зависит от текущей версии приложения.

---

## 14. Проверка автомобилей

Endpoint:

```text
GET /vehicles
```

Проверка из PowerShell:

```powershell
Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "http://localhost:3000/vehicles"
```

При корректно выполненном seed возвращается список автомобилей.

---

## 15. Проверка водителей

Endpoint:

```text
GET /drivers
```

Команда:

```powershell
Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "http://localhost:3000/drivers"
```

При корректно выполненном seed возвращается список водителей.

---

## 16. Проверка PostgreSQL из контейнера

Для выполнения SQL непосредственно внутри PostgreSQL-контейнера:

```powershell
docker compose exec postgres psql `
    -U fleetcontrol `
    -d fleetcontrol
```

Например, просмотр автомобилей:

```powershell
docker compose exec postgres psql `
    -U fleetcontrol `
    -d fleetcontrol `
    -c "SELECT id, brand, model, availability_status FROM vehicles ORDER BY id;"
```

Просмотр водителей:

```powershell
docker compose exec postgres psql `
    -U fleetcontrol `
    -d fleetcontrol `
    -c "SELECT id, full_name, status FROM drivers ORDER BY id;"
```

---

## 17. Persistent volume

Для PostgreSQL используется именованный volume:

```text
postgres_data
```

Он подключается к:

```text
/var/lib/postgresql/data
```

Благодаря этому данные БД не зависят от жизненного цикла контейнера PostgreSQL.

Обычная остановка:

```bash
docker compose down
```

удаляет контейнеры и сеть, но не удаляет данные PostgreSQL.

После повторного запуска:

```bash
docker compose up -d
```

ранее сохранённые данные остаются доступны.

---

## 18. Полное удаление базы данных

Команда:

```bash
docker compose down -v
```

удаляет:

- контейнеры;
- сеть;
- volumes.

После этого база данных будет создана заново при следующем запуске.

Команду `down -v` следует использовать только тогда, когда необходимо полностью сбросить контейнерное окружение и данные.

---

## 19. Просмотр логов

Логи приложения:

```bash
docker compose logs app
```

Непрерывный просмотр:

```bash
docker compose logs -f app
```

Логи PostgreSQL:

```bash
docker compose logs postgres
```

Логи всех сервисов:

```bash
docker compose logs
```

---

## 20. Пересборка приложения

После изменения Dockerfile или зависимостей рекомендуется:

```bash
docker compose up --build
```

Если требуется принудительная пересборка:

```bash
docker compose build --no-cache
docker compose up
```

---

## 21. Остановка системы

Остановка и удаление контейнеров:

```bash
docker compose down
```

Если требуется только остановить контейнеры без удаления:

```bash
docker compose stop
```

Повторный запуск:

```bash
docker compose start
```

---

## 22. Диагностика

### Приложение не запускается

Проверить:

```bash
docker compose ps
```

и:

```bash
docker compose logs app
```

### PostgreSQL не готов

Проверить:

```bash
docker compose logs postgres
```

### Ошибка подключения к БД

В Docker Compose `DATABASE_URL` должен содержать:

```text
@postgres:5432
```

а не:

```text
@localhost:5432
```

### Порт 3000 уже занят

Необходимо остановить локально запущенный Node.js-процесс или другой контейнер, использующий порт 3000.

---

## 23. Развёртывание с чистого окружения

Полный воспроизводимый сценарий:

```bash
git clone <repository>
cd fleet_control
docker compose up --build
```

После запуска проверить:

```text
http://localhost:3000/health
```

Затем:

```text
http://localhost:3000/vehicles
http://localhost:3000/drivers
```

Таким образом, для развёртывания FleetControl не требуется вручную устанавливать PostgreSQL или создавать структуру базы данных.

Docker Compose предоставляет единое воспроизводимое окружение приложения и БД.