#!/bin/bash
# Клипы Kling 1080x1920 24 к/с → кадры webp для скролла (12 к/с, 121 кадр на клип).
# Два набора: lo 540x960 (телефон, Telegram), hi 720x1280 (десктоп-панель).
# ffmpeg из Homebrew собран без libwebp, поэтому webp — через cwebp; параллельно — пулом в Python
# (xargs -I на macOS режет строку подстановки на 255 байт).
#   bash film/site/tools/frames.sh film/vifix/out film/site/seq/v1
set -euo pipefail
SRC=${1:?папка с c01..c09.mp4}; OUT=${2:?папка seq/vN}
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
# клипы (c01…) и переходы (t12…): все cNN.mp4 и tNN.mp4 из папки; можно передать список третьим аргументом
NAMES=${3:-$(cd "$SRC" && ls | grep -E '^[ct][0-9]{2}\.mp4$' | sed 's/\.mp4$//' | tr '\n' ' ')}
for c in $NAMES; do
  mkdir -p "$TMP/$c" "$OUT/lo/$c" "$OUT/hi/$c"
  ffmpeg -v error -y -i "$SRC/$c.mp4" -vf "fps=12,scale=720:1280:flags=lanczos" -start_number 1 "$TMP/$c/%d.png"
done
python3 - "$TMP" "$OUT" <<'PY'
import sys, os, subprocess
from concurrent.futures import ThreadPoolExecutor
tmp, out = sys.argv[1], sys.argv[2]
jobs = []
for c in sorted(os.listdir(tmp)):
    for f in os.listdir(os.path.join(tmp, c)):
        n = f[:-4]; p = os.path.join(tmp, c, f)
        jobs.append(['cwebp', '-quiet', '-m', '6', '-q', '54', p, '-o', f'{out}/hi/{c}/{n}.webp'])
        jobs.append(['cwebp', '-quiet', '-m', '6', '-q', '56', '-resize', '540', '960', p, '-o', f'{out}/lo/{c}/{n}.webp'])
with ThreadPoolExecutor(8) as ex:
    list(ex.map(lambda j: subprocess.run(j, check=True), jobs))
print(len(jobs), 'файлов')
PY
for c in $NAMES; do printf '%s %s  ' "$c" "$(ls "$OUT/lo/$c" | wc -l | tr -d ' ')"; done; echo
du -sh "$OUT/lo" "$OUT/hi"
