#!/usr/bin/env python3
"""Собирает фильм-сайт v3: film/site/index.html из index.src.html.

- секции под фильмом берутся из v2 (film/landing/template.html), где тексты уже сверены с фаундерами;
- картинки {{IMG:x}} → img/x.<ext>, в film/site/img копируются только нужные;
- seq/v1/manifest.json пересчитывается по папкам кадров (сколько кадров в каждом отрезке).

    python3 film/site/build.py
    python3 -m http.server -d film/site 8776
"""
import json, os, re, shutil

here = os.path.dirname(os.path.abspath(__file__))
landing = os.path.join(here, '..', 'landing')
tpl = open(os.path.join(landing, 'template.html'), encoding='utf-8').read()

os.makedirs(os.path.join(here, 'img'), exist_ok=True)
def img_path(name):
    for ext in ('svg', 'jpg', 'png', 'webp'):
        src = os.path.join(landing, 'img', f'{name}.{ext}')
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(here, 'img', f'{name}.{ext}'))
            return f'img/{name}.{ext}'
    raise SystemExit(f'нет картинки {name}')
# брендовые файлы и фото команды живут в v2, экраны приложений — в img/app (tools: из галереи портфолио)
for name in ('mark-flat', 'wordmark-flat', 'ph-roman', 'ph-dmitry', 'ph-denis'):
    img_path(name)
sections = ''
blocks = []
src = open(os.path.join(here, 'index.src.html'), encoding='utf-8').read()
out = src.replace('<!--SECTIONS-->', sections)
open(os.path.join(here, 'index.html'), 'w', encoding='utf-8').write(out)

# английская версия: тот же каркас, текст по словарю i18n/en.json, скриншоты из img/app-en (где они есть)
tr = json.load(open(os.path.join(here, 'i18n', 'en.json'), encoding='utf-8'))
T, CTX = tr['text'], tr['ctx']
en = out
for a_, b_ in CTX: en = en.replace(a_, b_)
def _tx(m):
    raw = m.group(1); key = raw.strip()
    return '>' + raw.replace(key, T[key]) + '<' if key in T else m.group(0)
en = re.sub(r'>([^<>]+)<', _tx, en)
en = re.sub(r'(alt|aria-label|title|content|placeholder)="([^"]*)"', lambda m: m.group(1) + '="' + T.get(m.group(2), m.group(2)) + '"', en)
en = en.replace('<html lang="ru">', '<html lang="en">')
en = en.replace('<a class="on" href="./" data-l="ru">RU</a><a href="en.html" data-l="en">EN</a>', '<a href="./" data-l="ru">RU</a><a class="on" href="en.html" data-l="en">EN</a>')
en_shots = 0
def _shot(m):
    global en_shots
    f = os.path.join(here, 'img', 'app-en', m.group(1))
    if os.path.exists(f): en_shots += 1; return 'img/app-en/' + m.group(1)
    return m.group(0)
en = re.sub(r'img/app/([a-z0-9-]+\.webp)', _shot, en)
en = en.replace('<script src="film.js"></script>', '<script>window.I18N=' + json.dumps(T, ensure_ascii=False) + '</script>\n<script src="film.js"></script>')
body = re.sub(r'<script[\s\S]*?</script>', '', en)
left = sorted(set(t.strip() for t in re.findall(r'>([^<>]*[А-Яа-яЁё][^<>]*)<', body))) + re.findall(r'(?:alt|aria-label|title|content)="([^"]*[А-Яа-яЁё][^"]*)"', body)
open(os.path.join(here, 'en.html'), 'w', encoding='utf-8').write(en)
if left: print('⚠️  EN: не переведено', len(left), '→', ' | '.join(left[:12]))

seq = os.path.join(here, 'seq', 'v1', 'lo')
manifest = {d: len([f for f in os.listdir(os.path.join(seq, d)) if f.endswith('.webp')])
            for d in sorted(os.listdir(seq)) if os.path.isdir(os.path.join(seq, d))}
for lane in ('lo', 'hi'):
    for d, n in manifest.items():
        m = len(os.listdir(os.path.join(here, 'seq', 'v1', lane, d)))
        assert m == n, f'{lane}/{d}: {m} кадров, а в lo {n}'
json.dump(manifest, open(os.path.join(here, 'seq', 'v1', 'manifest.json'), 'w'))

used = set(re.findall(r'img/([a-z0-9-]+\.[a-z]+)', out + en + open(os.path.join(here, 'style.css'), encoding='utf-8').read()))
for f in os.listdir(os.path.join(here, 'img')):
    full = os.path.join(here, 'img', f)
    if os.path.isfile(full) and f not in used: os.remove(full)
print(f'ok: index.html + en.html (EN-скриншотов {en_shots}) · {len(out) // 1024} КБ · картинок {len(used)} · отрезков {len(manifest)} · кадров {sum(manifest.values())}')
