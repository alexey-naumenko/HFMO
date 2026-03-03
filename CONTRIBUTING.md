# Contributing

Спасибо за интерес к проекту **Huntflow Menu Organizer**! Ниже описано, как начать разработку, запускать проверки и оформлять изменения.

---

## Как начать

1. Форкните репозиторий и клонируйте его:

```bash
git clone https://github.com/<your-username>/HFMO.git
cd HFMO
npm install
```

2. Загрузите расширение в Chrome:
   - Откройте `chrome://extensions/`
   - Включите **Режим разработчика**
   - Нажмите **Загрузить распакованное расширение** и выберите папку проекта

3. Используйте `example.html` для локального тестирования без Huntflow.

---

## Отладка

1. Откройте консоль разработчика (F12)
2. Проверьте вкладку **Console** на наличие ошибок
3. Во вкладке **Application** → Storage проверьте сохранённые данные
4. Используйте `example.html` для изоляции проблемы

---

## Линтер и тесты

```bash
# Линтинг
npm run lint

# Тесты
npm test
```

Перед отправкой PR убедитесь, что обе команды завершаются без ошибок.

---

## Conventional Commits

Проект использует [Conventional Commits](https://www.conventionalcommits.org/) для автоматического версионирования:

```
feat: добавить экспорт категорий        → minor (1.x.0)
fix: исправить drag & drop в Firefox    → patch (1.0.x)
feat!: переработать API хранилища       → major (x.0.0)
```

Другие допустимые префиксы: `docs`, `style`, `refactor`, `test`, `chore`, `ci`.

---

## Процесс Pull Request

1. Создайте ветку от `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Внесите изменения и убедитесь, что `npm run lint` и `npm test` проходят.
3. Оформите коммиты по Conventional Commits.
4. Откройте Pull Request в `main` с описанием изменений.
5. Дождитесь прохождения CI и ревью.
