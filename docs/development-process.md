# Процесс разработки FleetControl

## 1. Назначение

Документ описывает принятый в FleetControl процесс разработки: управление задачами, работу с Git и GitHub, тестирование, CI и выпуск версий.

Основные инструменты проекта:

- Jira Cloud — управление задачами, спринтами и версиями;
- Git и GitHub — контроль версий и Pull Request;
- GitHub Actions — CI;
- Jest и Supertest — автоматизированные тесты;
- PostgreSQL — база данных;
- Docker и Docker Compose — контейнерное развёртывание.

---

## 2. Jira и workflow

В проекте используются:

- Epic — крупное направление;
- Story — функциональный сценарий;
- Task — самостоятельная техническая работа;
- Bug — дефект;
- Subtask — часть родительской задачи.

Основной workflow для Task и Bug:

```text
To Do
  ↓
In Progress
  ↓
In Review
  ↓
Testing
  ↓
Ready for Release
  ↓
Done
```

Назначение статусов:

- `To Do` — работа запланирована;
- `In Progress` — реализация начата;
- `In Review` — создан Pull Request;
- `Testing` — выполняется проверка изменений;
- `Ready for Release` — изменение интегрировано и готово к выпуску;
- `Done` — изменение вошло в выпущенную версию.

При замечаниях Code Review задача может быть возвращена:

```text
In Review → In Progress
```

После доработки используется тот же Pull Request.

Для крупных Story технические Task могут связываться с ними отношением `Реализация`.

---

## 3. Основные Git-ветки

В проекте используются три постоянные ветки.

### `main`

Содержит актуальную выпущенную production-версию.

### `develop`

Интеграционная ветка следующей функциональной версии.

Новые возможности разрабатываются по схеме:

```text
feature/* → develop
```

### `maintenance`

Интеграционная ветка исправлений текущей production-версии:

```text
bugfix/* → maintenance
```

Так разработка следующей версии и сопровождение production могут выполняться параллельно.

---

## 4. Временные ветки

### Feature

Используются для новой функциональности:

```text
feature/FLEET-13-return-replacement-vehicle
```

Создаются от `develop`.

### Bugfix

Используются для обычных production-дефектов:

```text
bugfix/FLEET-34-active-driver-validation
```

Создаются от `maintenance`.

### Release

Используются для подготовки конкретной версии:

```text
release/0.2.1
release/1.0.0
```

В них выполняются только действия, связанные с выпуском: изменение номера версии, финальные проверки и release-specific исправления.

### Hotfix

Может использоваться для критического production-дефекта, который необходимо выпустить немедленно.

---

## 5. Работа над задачей

Ключ Jira-задачи указывается в названии ветки и commit.

Пример:

```text
feature/FLEET-20-docker-compose
```

Commit:

```text
FLEET-20 Add Docker Compose deployment
```

Типовой feature flow:

```text
Jira
 ↓
feature/*
 ↓
разработка
 ↓
автоматизированные тесты
 ↓
PR в develop
 ↓
Code Review
 ↓
Testing
 ↓
merge
 ↓
Ready for Release
```

При замечании Code Review изменения выполняются в той же ветке и добавляются в уже открытый Pull Request новым commit.

---

## 6. Исправление дефектов

Production-дефекты регистрируются в Jira как Bug.

Для них фиксируются:

```text
Affects Version
Fix Version
```

Например:

```text
Affects Version: 0.2.0
Fix Version: 0.2.1
```

Обычный процесс:

```text
Bug
 ↓
bugfix/*
 ↓
регрессионный тест
 ↓
исправление
 ↓
PR в maintenance
 ↓
Testing
 ↓
Ready for Release
```

Регрессионный тест должен подтверждать исправленное поведение и предотвращать повторное появление дефекта.

---

## 7. Pull Request и Code Review

Основные направления PR:

```text
feature/* → develop
bugfix/*  → maintenance
release/* → main
```

Перед merge проверяются:

- соответствие требованиям задачи;
- корректность реализации;
- наличие тестов;
- результат CI;
- отсутствие нежелательных изменений.

После merge временная ветка удаляется.

Комментарии к конкретным изменениям фиксируются в GitHub, а Jira используется для отражения состояния работы.

---

## 8. Тестирование и CI

Автоматизированные тесты выполняются через Jest и Supertest.

Локальный запуск:

```bash
npm test
```

CI:

```bash
npm run test:ci
```

GitHub Actions запускает тесты для Pull Request и push в:

```text
develop
maintenance
main
```

Кроме автоматизированных тестов используются ручные API-проверки на реальной PostgreSQL.

Ручные test cases хранятся в:

```text
docs/test-cases/
```

---

## 9. Управление версиями

Проект использует Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

Примеры:

```text
0.2.0
0.2.1
1.0.0
```

Для выпуска используются:

- Jira Version;
- release-ветка;
- Git tag;
- GitHub Release.

Пример:

```text
v0.2.1
```

---

## 10. Functional release

Функциональная версия формируется из `develop`:

```text
feature/*
   ↓
develop
   ↓
release/X.Y.0
   ↓
main
   ↓
tag
   ↓
GitHub Release
```

После выпуска соответствующая Jira Version переводится в состояние Released, а задачи версии — в `Done`.

---

## 11. Patch release

Исправления production интегрируются через `maintenance`:

```text
bugfix/*
   ↓
maintenance
   ↓
release/X.Y.Z
   ↓
main
   ↓
tag
```

Таким образом был подготовлен patch-релиз `0.2.1`.

После выпуска production-исправления должны быть перенесены в дальнейшую разработку, чтобы они не потерялись в следующей функциональной версии.

---

## 12. Синхронизация с develop

После выпуска patch-версии исправления переносятся в `develop` через Pull Request.

Если ветки совместимы, выполняется обычный merge.

Если код будущей версии уже существенно изменился, выполняется forward-port: переносится исправленное поведение, а не обязательно тот же фрагмент исходного кода.

После переноса повторно запускаются регрессионные тесты.