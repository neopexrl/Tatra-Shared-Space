export const shellVariants = [
  {
    label: 'Mobile shell',
    format: '390 x 844',
    audience: 'Основной сценарий для телефона через Expo Go и native build.',
    description:
      'Главный экран банка показывается как статичная витрина. Пользователь видит привычный shell и переходит в Shared Spaces по одной заметной CTA-кнопке.',
  },
  {
    label: 'Tablet shell',
    format: '834 x 1194',
    audience: 'Питч-режим для iPad и больших Android-планшетов.',
    description:
      'Тот же shell, но с большей плотностью UI. Подходит для демонстрации продукта на встречах и презентациях без отдельного redesign.',
  },
  {
    label: 'Web shell',
    format: 'responsive',
    audience: 'Сайт-версия для desktop и browser demo.',
    description:
      'На web layout масштабируется в responsive grid. Скрин банка остается заглушкой, а Shared Spaces открывается как отдельный модуль поверх общей продуктовой истории.',
  },
] as const;

export const deliveryLayers = [
  {
    tag: 'Frontend',
    title: 'Frontend shell',
    description:
      'Expo-приложение становится демонстрационным клиентом для mobile и web. Здесь живут только экраны, состояния, навигация и визуальная упаковка сценария.',
    items: [
      'mock bank home с одной рабочей точкой входа',
      'единый responsive shell для mobile, tablet и web',
      'экраны Shared Spaces без критичных вычислений на клиенте',
      'готовность к подмене заглушек реальными скринами банка',
    ],
  },
  {
    tag: 'Backend',
    title: 'Calculation and orchestration backend',
    description:
      'Все правила разделения сумм, проверка входных данных, статусы request flow и история операций должны жить на сервере, а не в банковском UI.',
    items: [
      'split и settlement calculations',
      'request validation и lifecycle статусов',
      'audit trail и event log',
      'API-контракты для mobile/web клиента',
    ],
  },
  {
    tag: 'Database',
    title: 'Database layer',
    description:
      'База данных остается единственным источником истины по spaces, участникам, транзакционным событиям и AI-подсказкам.',
    items: [
      'users, spaces, participants, payment_requests',
      'receipt_items, settlements, assistant_runs',
      'история действий и статусы согласований',
      'подготовка к аналитике и replay demo-flow',
    ],
  },
  {
    tag: 'AI',
    title: 'AI assistant layer',
    description:
      'AI подключается как слой рекомендаций: он помогает с чеком, подсказывает split и объясняет ситуацию, но не принимает финансовые решения сам.',
    items: [
      'receipt parsing и item grouping',
      'suggested split с server-side confirmation',
      'assistant hints для debt summary и next actions',
      'guardrails и logging для prompts и outputs',
    ],
  },
] as const;

export const repoSections = [
  {
    path: 'app/',
    purpose: 'Expo Router entry points: mock bank shell и вход в Shared Spaces module.',
  },
  {
    path: 'src/setup/',
    purpose: 'Новый frontend scaffold: тема, reusable panels и setup data для UI.',
  },
  {
    path: 'assets/reference-screens/',
    purpose: 'Место для реальных скринов home screen банка, которые потом подставляются в витринные заглушки.',
  },
  {
    path: 'backend/api/',
    purpose: 'Будущий HTTP/API слой для клиента, orchestration и contract-first endpoints.',
  },
  {
    path: 'backend/calculations/',
    purpose: 'Изолированная зона для split, settlement и business rules.',
  },
  {
    path: 'backend/database/',
    purpose: 'Схема БД, migrations, seed и data ownership для demo и production path.',
  },
  {
    path: 'backend/ai/',
    purpose: 'Пайплайн AI assistant, prompt contracts, evaluation notes и safety rules.',
  },
  {
    path: 'docs/',
    purpose: 'Архитектурные решения и реализация следующего этапа после setup push.',
  },
] as const;

export const operatingRules = [
  'Расчеты долгов, split и final amounts не выполняются во frontend клиента.',
  'UI показывает только уже подготовленные состояния, статусы и результаты.',
  'База данных хранит canonical state для spaces, requests и assistant outputs.',
  'AI assistant дает рекомендации, но финальное решение подтверждает backend.',
] as const;

export const nextMilestones = [
  'Подложить реальные screenshot assets для mobile, tablet и web shell.',
  'Поднять backend API и перевести все расчеты в server-side flow.',
  'Спроектировать database schema под spaces, participants, requests и audit log.',
  'Подключить AI assistant к receipt/split pipeline через backend orchestration.',
  'Собрать минимальный end-to-end demo path: shell -> shared spaces -> backend response.',
] as const;
