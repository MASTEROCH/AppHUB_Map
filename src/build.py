#!/usr/bin/env python3
"""Собирает самодостаточные HTML из шаблонов src/ + ассетов (CSS/JS/данные инлайнятся).
Запуск:  python3 src/build.py   (из корня проекта)
Редактируй ТОЛЬКО src/* — корневые index.html и AppHub-карта-экосистемы.html генерируются."""
import pathlib

SRC = pathlib.Path(__file__).parent
ROOT = SRC.parent

css  = (SRC / "style.css").read_text(encoding="utf-8")
data = (SRC / "data.js").read_text(encoding="utf-8")
app  = (SRC / "app.js").read_text(encoding="utf-8")

def inline(html: str) -> str:
    html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="data.js"></script>', f"<script>\n{data}\n</script>")
    html = html.replace('<script src="app.js"></script>', f"<script>\n{app}\n</script>")
    return "<!-- СГЕНЕРИРОВАНО из src/ через build.py — не редактировать вручную -->\n" + html

targets = {
    "public.html":   "index.html",
    "internal.html": "AppHub-карта-экосистемы.html",
}
for tpl, out in targets.items():
    src_html = (SRC / tpl).read_text(encoding="utf-8")
    (ROOT / out).write_text(inline(src_html), encoding="utf-8")
    print(f"✓ {out}  ({len(inline(src_html))//1024} KB, self-contained)")
print("Готово.")
