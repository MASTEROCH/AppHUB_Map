#!/usr/bin/env python3
"""Собирает фильм-сайт v3: film/site/index.html из index.src.html.

- секции под фильмом берутся из v2 (film/landing/template.html), где тексты уже сверены с фаундерами;
- картинки {{IMG:x}} → img/x.<ext>, в film/site/img копируются только нужные;
- seq/v1/manifest.json пересчитывается по папкам кадров (сколько кадров в каждом отрезке).

    python3 film/site/build.py
    python3 -m http.server -d film/site 8776
"""
import json, os, re, shutil
import subprocess

# страж: сломанный film.js не должен уйти даже в сборку (04.10 скобка ушла в комментарий — заставка висела вечно)
_chk = subprocess.run(['node', '--check', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'film.js')], capture_output=True, text=True)
if _chk.returncode: raise SystemExit('🚨 film.js не парсится:\n' + _chk.stderr.strip()[:600])

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
en = en.replace('img/og-ru.jpg', 'img/og-en.jpg').replace('content="ru_RU"', 'content="en_US"')
en = en.replace('<a class="on" href="./" data-l="ru">RU</a><a href="en.html" data-l="en">EN</a>', '<a href="./" data-l="ru">RU</a><a class="on" href="en.html" data-l="en">EN</a>')
en_shots = 0
def _shot(m):
    global en_shots
    f = os.path.join(here, 'img', 'app-en', m.group(1))
    if os.path.exists(f): en_shots += 1; return 'img/app-en/' + m.group(1)
    return m.group(0)
en = re.sub(r'img/app/([a-z0-9-]+\.webp)', _shot, en)
# слайдшоу на EN: кадры без английской версии выкидываем (русский интерфейс на английской странице — нельзя); точки пересчитываем
def _shots(m):
    block = m.group(0)
    imgs = re.findall(r'<img[^>]*>', block)
    keep = [i for i in imgs if 'img/app-en/' in i]
    if not keep: return block
    keep[0] = re.sub(r'<img(?! class="on")', '<img class="on"', keep[0], 1) if 'class="on"' not in keep[0] else keep[0]
    keep = [keep[0]] + [k.replace(' class="on"', '') for k in keep[1:]]
    dots = '' if len(keep) < 2 else '<div class="dots">' + ''.join('<i class="on"></i>' if k == 0 else '<i></i>' for k in range(len(keep))) + '</div>'
    return re.sub(r'(<div class="car shots"[^>]*>)[\s\S]*?(</div></div>)$', lambda q: q.group(1) + ''.join(keep) + dots + q.group(2), block)
en = re.sub(r'<div class="car shots"[^>]*>[\s\S]*?</div></div>', _shots, en)
en = en.replace('<script src="film.js"></script>', '<script>window.I18N=' + json.dumps(T, ensure_ascii=False) + '</script>\n<script src="film.js"></script>')
body = re.sub(r'<script[\s\S]*?</script>', '', en)
left = sorted(set(t.strip() for t in re.findall(r'>([^<>]*[А-Яа-яЁё][^<>]*)<', body))) + re.findall(r'(?:alt|aria-label|title|content)="([^"]*[А-Яа-яЁё][^"]*)"', body)
# типографика: короткие слова не висят в конце строки, перед тире — неразрывный пробел (только в текстовых узлах)
def typo(html, short):
    rx = re.compile(r'(?<![\w&;])(' + short + r') (?=\S)', re.I)
    def fix(m):
        t = m.group(1)
        if not t.strip() or '{' in t or '=>' in t: return m.group(0)
        t = rx.sub(lambda k: k.group(1) + '&nbsp;', t)
        t = t.replace(' — ', '&nbsp;— ').replace(' – ', '&nbsp;– ')
        t = re.sub(r'(\d)([–-])(\d)', '\\1&#8288;\\2&#8288;\\3', t)              # «1–5%», «12–16» не рвутся на тире
        return '>' + t + '<'
    parts = re.split(r'(<script[\s\S]*?</script>|<style[\s\S]*?</style>)', html)
    return ''.join(x if x.startswith(('<script', '<style')) else re.sub(r'>([^<>]+)<', fix, x) for x in parts)
out = typo(out, r'в|во|на|с|со|и|а|но|по|за|у|к|ко|о|об|от|до|из|не|ни|для|при|без|это|что|как|их|её|его|мы|я')
en = typo(en, r'a|an|the|to|of|in|on|at|by|and|or|for|is|it|we|no')
open(os.path.join(here, 'index.html'), 'w', encoding='utf-8').write(out)
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
