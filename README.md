<div align="center">

# Huntflow Menu Organizer

**Chrome-расширение для группировки и сортировки вакансий по категориям в Huntflow**

[![Pipeline](https://github.com/alexey-naumenko/HFMO/actions/workflows/pipeline.yml/badge.svg)](https://github.com/alexey-naumenko/HFMO/actions/workflows/pipeline.yml)
[![GitHub release](https://img.shields.io/github/v/release/alexey-naumenko/HFMO?style=flat&colorA=18181B&colorB=28CF8D)](https://github.com/alexey-naumenko/HFMO/releases)
[![Chrome Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat&colorA=18181B&colorB=4285F4)](https://developer.chrome.com/docs/extensions/mv3/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=flat&colorA=18181B&colorB=F7DF1E)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat&colorA=18181B&colorB=28CF8D)](LICENSE)
[![semantic-release](https://img.shields.io/badge/semantic--release-auto-e10079?style=flat&colorA=18181B)](https://github.com/semantic-release/semantic-release)

<br />

*Расширение позволяет HR-специалистам и рекрутерам организовывать вакансии в [Huntflow](https://huntflow.ru), создавая пользовательские категории с удобным drag & drop интерфейсом.*

</div>

---

## Описание

**Huntflow Menu Organizer** — Chrome-расширение, которое добавляет в боковое меню Huntflow возможность группировки вакансий по пользовательским категориям. Расширение полностью заменяет стандартный список вакансий на организованный интерфейс с поддержкой drag & drop, автосинхронизации и сохранения состояния.

---

## Возможности

| Функция | Описание |
|---------|----------|
| **Управление категориями** | Создание, переименование и удаление пользовательских категорий |
| **Drag & Drop** | Перетаскивание вакансий между категориями и изменение порядка внутри |
| **Автосинхронизация** | MutationObserver отслеживает изменения DOM и синхронизирует список |
| **Сохранение состояния** | Структура категорий и состояние свёрнутости сохраняются в Chrome Storage |
| **Подсветка активной** | Текущая открытая вакансия подсвечивается в меню |
| **Тёмная тема** | Интерфейс полностью соответствует нативному дизайну Huntflow |
| **Ручная синхронизация** | Кнопка принудительного обновления списка из DOM |

---

## Установка

### Системные требования

- **Браузер**: Google Chrome 88+ или Chromium-based браузеры (Edge, Brave, Arc)
- **Платформа**: Windows, macOS, Linux

### Из релиза (рекомендуется)

1. Скачайте последний релиз со страницы [Releases](https://github.com/alexey-naumenko/HFMO/releases)
2. Распакуйте ZIP-архив
3. Откройте `chrome://extensions/`
4. Включите **Режим разработчика**
5. Нажмите **Загрузить распакованное расширение** и выберите распакованную папку

### Из исходников

```bash
git clone https://github.com/alexey-naumenko/HFMO.git
cd HFMO
```

Затем загрузите папку проекта как распакованное расширение в `chrome://extensions/`.

---

## Использование

### В Huntflow

1. Откройте ваш аккаунт Huntflow и перейдите в раздел **Мои вакансии**
2. В левом сайдбаре появится интерфейс плагина
3. Нажмите **+ Добавить категорию** для создания категории
4. Перетащите вакансии в нужные категории

### Управление категориями

| Действие | Как |
|----------|-----|
| Создать категорию | Кнопка **+ Добавить категорию** |
| Переименовать | Иконка карандаша рядом с названием |
| Удалить | Иконка корзины (вакансии вернутся в «Без категории») |
| Свернуть/развернуть | Клик по заголовку категории |
| Синхронизировать | Кнопка **Синхронизировать** |

### Локальное тестирование

Откройте `example.html` в браузере для тестирования функциональности без Huntflow.

---

## Структура проекта

```
HFMO/
├── manifest.json          # Манифест Chrome Extension (Manifest V3)
├── content.js             # Основная логика расширения
├── styles.css             # Стили интерфейса (тёмная тема)
├── example.html           # Тестовая страница
├── package.json           # Зависимости и скрипты
├── eslint.config.js       # Конфигурация ESLint
├── __tests__/             # Юнит-тесты (Jest)
├── CONTRIBUTING.md        # Гайд для контрибьюторов
├── LICENSE                # GNU General Public License v3.0
├── README.md              # Документация
└── .github/
    ├── dependabot.yml     # Конфигурация Dependabot
    └── workflows/
        └── pipeline.yml   # CI/CD: линтинг, тесты, релиз
```

---

## Технические характеристики

| Параметр | Значение |
|----------|----------|
| **Платформа** | Chrome Extension Manifest V3 |
| **Языки** | JavaScript (ES6+), CSS3, HTML5 |
| **Зависимости** | Нет (Vanilla JavaScript) |
| **Хранение данных** | Chrome Storage Local API |
| **DOM-наблюдение** | MutationObserver с debounce |
| **Drag & Drop** | HTML5 Drag and Drop API |
| **Размер** | ~15 KB |

---

## История версий

### v1.2

- Обновлённый дизайн под нативный стиль Huntflow
- Закруглённые углы (12px для категорий, 10px для вакансий)
- Современные box-shadow эффекты
- Плавные анимации с cubic-bezier

### v1.1

- Улучшенная совместимость с разными версиями UI Huntflow
- Адаптивные CSS-селекторы через `[class*="titleText--"]`
- Исправлен парсинг данных вакансий
- Добавлена тестовая страница `example.html`

### v1.0

- Базовый функционал drag & drop
- Создание, переименование, удаление категорий
- Сворачивание категорий
- Сохранение в Chrome Storage

---

## Устранение неполадок

<details>
<summary><b>Плагин не загружается на Huntflow</b></summary>

- Проверьте, что расширение включено в `chrome://extensions/`
- Убедитесь, что вы на странице **Мои вакансии**
- Очистите кэш и перезагрузите страницу

</details>

<details>
<summary><b>Кнопка «Добавить категорию» не появляется</b></summary>

- Откройте консоль (F12) и проверьте ошибки
- Убедитесь, что Huntflow полностью загрузился
- Протестируйте на `example.html`

</details>

<details>
<summary><b>Drag & Drop не работает</b></summary>

- Проверьте, что вакансии полностью загружены
- Убедитесь, что курсор находится на элементе вакансии
- Создайте хотя бы одну категорию

</details>

<details>
<summary><b>Данные не сохраняются</b></summary>

- Проверьте разрешения расширения в настройках Chrome
- DevTools → Application → Storage → Extension

</details>

---

## Разработка

Подробнее в [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Авторы

| Роль | Автор | GitHub |
|------|-------|--------|
| Разработчик | Zahar Izmailov | [@izzzzzi](https://github.com/izzzzzi) |
| Разработчик | Alisher Gaffarov | [@Alik20021223](https://github.com/Alik20021223) |
| Идея и концепция | Alexey Naumenko | [@alexey-naumenko](https://github.com/alexey-naumenko) |

---

## Лицензия

[GNU General Public License v3.0](LICENSE)
