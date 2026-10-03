#!/usr/bin/env python3
"""Собирает film/landing/index.html из template.html: вшивает картинки из img/ как data-URI.

    python3 film/landing/build.py            # → film/landing/index.html
    python3 -m http.server -d film/landing   # открыть http://localhost:8000

Видео: в template.html есть таблица VIDEO = {} внутри <script>. Положите ролики рядом
(например film/landing/video/clip-01.mp4) и впишите VIDEO.s02='video/clip-01.mp4' и т. д.
Номера сцен → роликов: s02→01, s03+s04→02, s05+s06+s07→03, s08→04, s09→05, s10→06,
s11→07 и 08, s13→09, s12→10. Сцена s01 (титр) видео не требует.
"""
import base64, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'template.html'), encoding='utf-8').read()

def data_uri(name: str) -> str:
    for ext, mime in (('svg', 'image/svg+xml'), ('jpg', 'image/jpeg'), ('png', 'image/png'), ('webp', 'image/webp')):
        path = os.path.join(here, 'img', f'{name}.{ext}')
        if os.path.exists(path):
            return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()
    sys.exit(f'нет картинки img/{name}.*')

names = set(re.findall(r'\{\{IMG:([a-z0-9-]+)\}\}', src))
for n in names:
    src = src.replace('{{IMG:' + n + '}}', data_uri(n))

# template.html писался под артефакт, который сам добавляет каркас документа.
# Вне артефакта без charset браузер читает UTF-8 как Latin-1, без viewport телефон рисует 980px.
if not src.lstrip().lower().startswith('<!doctype'):
    src = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           '<meta name="theme-color" content="#0A0A14">\n</head>\n<body>\n' + src + '\n</body>\n</html>\n')

out = os.path.join(here, 'index.html')
open(out, 'w', encoding='utf-8').write(src)
print(f'ok: {out} · {len(src) // 1024} KB · {len(names)} картинок')
