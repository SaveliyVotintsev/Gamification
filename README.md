# Геймификация — тренажёр

Статический сайт-тренажёр для подготовки по теме «Программное обеспечение геймификации». 60 вопросов с одиночным выбором, мгновенная проверка, работа над ошибками.

## Локальный запуск

```bash
python -m http.server 8000
```

Открыть http://localhost:8000/

Прямое открытие `index.html` через `file://` не сработает из-за политики `fetch`.

## Стек

Vanilla HTML + CSS + JS. Без сборщика и зависимостей.

## Деплой на GitHub Pages

1. Создать репозиторий на GitHub и запушить код:

   ```bash
   git remote add origin https://github.com/USER/REPO.git
   git push -u origin main
   ```

2. В репозитории: **Settings** → **Pages** → **Source: Deploy from a branch** → **Branch: main / (root)** → **Save**.
3. Через пару минут сайт доступен по адресу `https://USER.github.io/REPO/`.

## Файлы

- `index.html` — разметка
- `styles.css` — стили и темы
- `app.js` — логика квиза
- `gamification_quiz.json` — вопросы
- `docs/superpowers/` — спека и план реализации
