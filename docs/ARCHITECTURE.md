# Architecture Outline

## 1. Frontend

Текущий frontend построен на Expo и Expo Router.

Цель frontend слоя:

- показать mock bank shell;
- поддерживать mobile, tablet и web layout;
- открывать Shared Spaces module;
- визуализировать данные и статусы, полученные с backend.

Ограничения frontend слоя:

- не считать финальные долги локально;
- не хранить canonical balance;
- не запускать AI workflow напрямую в trusted path.

## 2. Backend API

Backend должен быть отдельным слоем между приложением и базой данных.

Основные зоны ответственности:

- валидация команд и payloads;
- orchestration split/settlement flow;
- управление payment requests;
- аудит и event logging;
- integration boundary для AI assistant.

## 3. Calculations

Calculation layer должна быть изолирована от UI.

Именно здесь должны жить:

- item-based split;
- group settlement;
- rounding policy;
- recalculation после изменения участников или receipt items;
- deterministic output для auditability.

## 4. Database

Database слой должен быть источником истины.

Базовые сущности:

- `users`
- `spaces`
- `participants`
- `expenses`
- `receipt_items`
- `payment_requests`
- `settlements`
- `assistant_runs`
- `event_log`

## 5. AI Assistant

AI assistant подключается только через backend.

Задачи AI:

- receipt parsing;
- item grouping;
- split suggestion;
- summary generation;
- explanation layer для пользователя.

Ограничение:

- AI не подтверждает денежные операции и не пишет финальные суммы в базу без backend validation.

## 6. Suggested next implementation order

1. Добавить реальные screenshot assets в `assets/reference-screens/`.
2. Поднять backend сервис с первыми API contracts.
3. Описать database schema и миграции.
4. Вынести split logic в backend/calculations.
5. Подключить frontend к mock API вместо локальных заглушек.
6. Подключить AI assistant через server-side orchestration.
