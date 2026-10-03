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

# секции v2 после финальной сцены фильма
tail = tpl[tpl.index('</section>', tpl.index('class="scene s13"')):]
starts = [m.start() for m in re.finditer(r'<section class="(sec|ask)', tail)]
blocks = []
for k, a in enumerate(starts):
    b = starts[k + 1] if k + 1 < len(starts) else tail.index('</section>', a) + len('</section>')
    blocks.append(tail[a:b].strip())
anchors = {0: 'ideas', 1: 'apps'}
for k, slug in anchors.items():
    blocks[k] = blocks[k].replace('<section class="sec">', f'<section class="sec" id="{slug}">', 1)
sections = '\n\n'.join(blocks)

os.makedirs(os.path.join(here, 'img'), exist_ok=True)
def img_path(name):
    for ext in ('svg', 'jpg', 'png', 'webp'):
        src = os.path.join(landing, 'img', f'{name}.{ext}')
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(here, 'img', f'{name}.{ext}'))
            return f'img/{name}.{ext}'
    raise SystemExit(f'нет картинки {name}')
sections = re.sub(r'\{\{IMG:([a-z0-9-]+)\}\}', lambda m: img_path(m.group(1)), sections)
for name in ('mark-flat', 'wordmark-flat'):
    img_path(name)

src = open(os.path.join(here, 'index.src.html'), encoding='utf-8').read()
out = src.replace('<!--SECTIONS-->', sections)
open(os.path.join(here, 'index.html'), 'w', encoding='utf-8').write(out)

seq = os.path.join(here, 'seq', 'v1', 'lo')
manifest = {d: len([f for f in os.listdir(os.path.join(seq, d)) if f.endswith('.webp')])
            for d in sorted(os.listdir(seq)) if os.path.isdir(os.path.join(seq, d))}
for lane in ('lo', 'hi'):
    for d, n in manifest.items():
        m = len(os.listdir(os.path.join(here, 'seq', 'v1', lane, d)))
        assert m == n, f'{lane}/{d}: {m} кадров, а в lo {n}'
json.dump(manifest, open(os.path.join(here, 'seq', 'v1', 'manifest.json'), 'w'))

used = set(re.findall(r'img/([a-z0-9-]+\.[a-z]+)', out))
for f in os.listdir(os.path.join(here, 'img')):
    if f not in used: os.remove(os.path.join(here, 'img', f))
print(f'ok: index.html · {len(out) // 1024} КБ · секций {len(blocks)} · картинок {len(used)} · отрезков {len(manifest)} · кадров {sum(manifest.values())}')
