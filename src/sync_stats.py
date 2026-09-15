#!/usr/bin/env python3
"""sync_stats.py — цифры портфолио для карты из ОДНОГО источника: массива проектов портфолио-бота.
Пишет v2/stats.json (карта читает его на лету, cache:no-store). Запускается из build.py; можно и вручную.
Источник: ~/code/apphub-portfolio/index.html → const P=[ {s,n,c,g,...}, ... ]  (g = число экранов, c = ниша)."""
import re, json, pathlib, datetime, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path.home() / "code" / "apphub-portfolio" / "index.html"
OUT = ROOT / "v2" / "stats.json"
def main():
    if not SRC.exists():
        print("sync_stats: портфолио не найдено, stats.json не тронут"); return 0
    html = SRC.read_text(encoding="utf-8")
    m = re.search(r"const P=\[(.*?)\n\];", html, re.S)
    if not m:
        print("sync_stats: массив P не найден"); return 1
    body = m.group(1)
    entries = re.findall(r'\{s:"([^"]+)",n:"([^"]+)",c:"([^"]+)".*?g:(\d+)', body)
    if not entries:
        print("sync_stats: записи не разобраны"); return 1
    niches = {c for _, _, c, _ in entries if c != "Админ-панель"}
    stats = {
        "portfolio": len(entries),
        "screens": sum(int(g) for *_, g in entries),
        "niches": len(niches),
        "admins": sum(1 for _, _, c, _ in entries if c == "Админ-панель"),
        "updated": datetime.date.today().isoformat(),
        "source": "t.me/Portfolio_AppHub_Bot",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ v2/stats.json  {stats['portfolio']} продуктов · {stats['screens']} экранов · {stats['niches']} ниш · {stats['admins']} админок")
    return 0
if __name__ == "__main__":
    sys.exit(main())
