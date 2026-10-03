# AppHUB Film · фильм-сайт для инвестора

Всё, что сделано 3 октября 2026 для питча: дека, раскадровка, прототип фильма-сайта и материалы для генерации роликов.

| Что | Где в репозитории | Живая версия |
|-----|-------------------|--------------|
| Фильм-сайт (прототип без видео) | `film/landing/` | https://claude.ai/artifact/EhR4uZeFrV41V5RdnqpMXz |
| Раскадровка v2.3, 13 кадров из 10 роликов | `film/storyboard/index.html` | https://claude.ai/artifact/P32D32GChvTXiZeFh95YWc |
| Дека, 16 слайдов (исходники Slides) | `film/deck/project/` | https://claude.ai/artifact/Qyd3VUWCUAvmu5uPSvS3F4 |
| Шот-лист для генерации: первый и последний кадр каждого ролика, 9:16 | `film/SHOTLIST.md`, `film/shots.json` | |
| Промт для чата «Инвестиционный питч стартапа» | `film/HANDOFF_PROMPT.md` | |

## Запустить лендинг локально

```bash
python3 film/landing/build.py          # собирает index.html из template.html + img/
python3 -m http.server -d film/landing # http://localhost:8000
```

Правки делаются в `template.html` (CSS, сцены, скрипт) и `img/`, затем `build.py`.

## Подставить видео

В `template.html` внутри `<script>` есть `var VIDEO={}`. Положите ролики в `film/landing/video/` и впишите:

```js
var VIDEO={s02:'video/clip-01.mp4',s03:'video/clip-02.mp4',s04:'video/clip-02.mp4',
  s05:'video/clip-03.mp4',s06:'video/clip-03.mp4',s07:'video/clip-03.mp4',s08:'video/clip-04.mp4',
  s09:'video/clip-05.mp4',s10:'video/clip-06.mp4',s11:'video/clip-07-08.mp4',s12:'video/clip-10.mp4',s13:'video/clip-09.mp4'};
```

Видео ложится под слой частиц и интерфейсов (`object-fit: cover`), вертикальные 9:16 ролики подходят без изменений.

## Структура фильма

13 сцен, 2:00. Короткая версия 60 с: сцены 01–08, 12, 13. Один слой частиц живёт через весь фильм: точка → рой → линия → орбита → дыхание → радужка → созвездие → поле → точка. Поверх: интерфейсы ноутбука и телефона (пуши, оплата картой или криптой, LET'S GO), 3D-дорожка, карта экосистемы, счётчик 4 000. Под фильмом страница раскрывается в деку.

Строка раунда «$2M за 10%» скрыта по умолчанию, включается хвостом `#round` в ссылке.
