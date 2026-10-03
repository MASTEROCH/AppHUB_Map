# AppHUB Film · шот-лист для генерации · вертикаль 9:16

Десять роликов. Для каждого: первый кадр, последний кадр, движение между ними, длительность. Промты на английском, под генераторы изображений и image-to-video с первым и последним кадром. Машиночитаемая версия: `shots.json`.

## Библия стиля · вставлять в начало каждого промта

**STYLE BLOCK (prepend to every prompt):**
`Cinematic vertical 9:16 frame, premium dark film look. Palette: deep navy-black shadows (#0A0A14), teal screen light (#00E0C7) as the only cold accent, violet practical lights (#7C3AFF) in night exteriors, warm amber desk lamp (#FFB547) indoors. Anamorphic lens character, shallow depth of field, soft bloom on light sources, fine film grain, slight vignette. Photoreal, 35mm film, no text, no logos, no watermark, no UI on screens (screens glow blank teal). Mood: Apple meets Telegram, quiet, expensive, precise.`

**NEGATIVE:** `text, letters, watermark, logo, UI elements, readable screen content, cartoon, illustration, oversaturated, HDR look, lens flare streaks, extra fingers, deformed hands, duplicate phone, horizontal composition, 16:9`

## Персонаж · одинаково во всех роликах

**CHARACTER BLOCK:**
`Mira, woman around 28, Eastern European features, dark hair in a loose messy bun with strands falling out, no makeup, tired but beautiful face, small silver stud earrings. Act I outfit: oversized graphite-grey hoodie, sleeves pulled over hands. Act III outfit: floor-length emerald silk slip dress, hair down and wavy, soft evening makeup, same earrings.`

Для сквозной консистентности: сгенерировать один референс-портрет Миры (анфас, нейтральный свет) и передавать его как image reference во все кадры с ней.

## Вертикальная композиция

В 9:16 ноутбук занимает середину кадра, лампа сверху, стол внизу. Телефон в вертикали читается идеально: кадрируем крупнее, чем в горизонтали. Глаз: радужка во всю ширину. Дорожка: сильная вертикальная перспектива, дверь в верхней трети, дорожка уходит от нижней кромки. Небо: вертикальный подъём камеры естественен.

---

## Ролик 01 · Стол и вкладки · 9 с · кадр 02

**Первый кадр.** `[STYLE][CHARACTER] Night apartment, Mira in grey hoodie sits at a desk in front of an open laptop, seen from the side at a three-quarter angle, slightly behind her shoulder. Warm amber desk lamp top-left is the only light, laptop screen glows cool blank white-teal onto her face. A phone lies face down beside the laptop, a mug, two sticky notes. Vertical 9:16: lamp in the upper third, laptop and her hands in the middle, desk edge at the bottom. She sits upright, focused. 24mm lens, camera at desk height.`

**Последний кадр.** `[STYLE][CHARACTER] Same desk, same framing moved slightly to the right (lateral dolly), three hours later: Mira slumped, head resting on her hand, hood half up, mug empty and tipped, more sticky notes, the laptop screen brighter and busier (still blank glow, no readable content). The lamp has a faint flicker glow. Exhausted, not angry.`

**Движение.** Slow lateral dolly left to right, handheld micro-shake, three visible jump cuts are added in edit from the same take: posture changes between them.

## Ролик 02 · Ошибка и крышка · 15 с · кадры 03 + 04

**Первый кадр.** `[STYLE][CHARACTER] Extreme close-up on the laptop screen edge and Mira's face lit by cold blue-white screen light, 85mm macro, tight crash-zoom framing. Her eyes reflect the glow. A thin wisp of smoke begins to rise from the keyboard gap at the bottom of the frame. Tension, stillness.`

**Последний кадр.** `[STYLE] The same desk in near-total darkness: the laptop lid is closed, lamp off, Mira's silhouette barely visible leaning back out of focus. The only light in the frame is a small teal glow from a phone lying face up on the desk in the lower third, casting a soft teal pool on the wood. Everything else black. Silence.`

**Движение.** One continuous take: crash-zoom into the screen, growing handheld shake, rack focus from screen to her face, smoke thickens, she closes the lid in one decisive gesture, light dies, camera sinks to desk level and freezes, phone glow appears. First static frame of the film.

## Ролик 03 · Телефон крупно · 23 с · кадры 05 + 06 + 07

**Первый кадр.** `[STYLE] Macro 85mm top-down-angled shot of a dark smartphone lying on a wooden desk at night, screen glowing blank teal-violet gradient (no UI), soft reflections of the room on the glass, shallow depth of field, the desk edge and a sticky note out of focus. Vertical 9:16, the phone centered and filling most of the width. Calm, premium product-film lighting.`

**Последний кадр.** `[STYLE][CHARACTER] Same phone, same desk, camera has slowly orbited about 30 degrees clockwise and moved slightly closer; Mira's hand enters from the bottom of the frame, index finger pressing the lower part of the glowing screen, fingertip lit teal, soft teal flash spreading from the touch point. Hoodie sleeve visible at the wrist.`

**Движение.** 60 fps. Slow push-in, then a small orbit, then the finger enters from below and presses. Pushes, payment sheet and the LET'S GO button are rendered by the site over the blank screen, synced to the timecode.

## Ролик 04 · Выдох · 16 с · кадры 05 (перебивки) + 08

**Первый кадр.** `[STYLE][CHARACTER] Medium close-up, 85mm, Mira in the dark room facing slightly down toward the phone (out of frame below), her face lit only by teal phone light from below, eyes moving as if reading notifications, lips slightly parted, tense hope. Vertical 9:16, head and shoulders, black background with a faint amber rim from the dead lamp.`

**Последний кадр.** `[STYLE][CHARACTER] Mira leaned back in the chair, head tilted back, eyes closed, a slow relieved smile just beginning, shoulders dropped, hands open in her lap. Teal light now softer and wider, a breath of warmth returning to the skin tones. Camera slightly pulled back to show the chair. The frame is still.`

**Движение.** First 8 s: she watches the phone, small reactions (used as cutaways between pushes). Then she leans back, closes her eyes, exhales; smile arrives a second later. Camera retreats with her and stops. Second static frame of the film.

## Ролик 05 · Глаз · 5 с · кадр 09

**Первый кадр.** `[STYLE][CHARACTER] Extreme macro of Mira's eye opening, 100mm macro, vertical 9:16 with the iris filling the width of the frame, dark violet-brown iris with fine fibers, a single teal catchlight reflecting a phone screen, wet lashes, skin texture visible. Black surroundings.`

**Последний кадр.** `[STYLE] Deep inside the pupil: total black with faint bokeh city lights beginning to appear at the center, tiny warm amber and violet points like a night seafront seen from a moving car, out of focus. Nothing else.`

**Движение.** Accelerating push into the pupil: slow for two seconds, then a rush into black. The city lights inside the pupil carry into clip 06.

## Ролик 06 · Дорожка одним дублем · 20 с · кадр 10

**Первый кадр.** `[STYLE][CHARACTER] Night, seafront boulevard, a black limousine door just opened, Mira in the emerald silk dress stepping out, seen from behind at shoulder height, steadicam. Ahead: a hotel entrance with a doorman holding the door, a straight red carpet running from the car through the lobby toward a lit terrace, violet and teal practical lights along the walls, warm amber lamps on columns. Vertical 9:16: the carpet runs from the bottom edge up to a glowing doorway in the upper third.`

**Последний кадр.** `[STYLE][CHARACTER] End of the red carpet on a rooftop terrace by the sea at dusk: a lit jacuzzi with steam, string lights, the sea and a violet-teal horizon. Mira seen from behind and above (camera has risen to a high angle) lowering herself into the water, dress left on a chair, champagne glass on the rim. Camera tilted upward so the upper half of the frame is darkening sky with the first stars.`

**Движение.** One continuous steadicam take from behind at 1.2× speed with three ramps to 40%: car door, walking the carpet, entering the water. At the end the camera rises to a high angle and tilts up into the sky. If the generator holds only 8–10 s, split at the doorway with a hidden cut; clip 10 becomes the second half.

## Ролик 07 · Из воды в небо · 5 с · кадр 11, начало

**Первый кадр.** `[STYLE] Looking straight down at the surface of jacuzzi water at night, teal underwater light, steam, small ripples, a few warm reflections of string lights. Vertical 9:16.`

**Последний кадр.** `[STYLE] Looking straight up at a clear night sky over the sea, no moon, dense stars, faint violet-teal glow at the bottom edge from the city below, a few stars subtly brighter forming the hint of a constellation. Vertical 9:16, nothing but sky.`

**Движение.** Continuous vertical tilt and rise from the water surface to pure sky, no cut. Last frame must match the first frame of the map footage (clip 08).

## Ролик 08 · Полёт над картой · 12 с · кадр 11

Готовый футаж фильма-путешествия по карте AppHUB (apphub-map-promo.vercel.app), кадрировать в 9:16 с медленным дрейфом вперёд. Новая генерация не нужна. Если нужен переходный кадр: `[STYLE] Night sky stars reorganizing into a glowing network diagram of nodes and thin lines, teal and violet points on black, seen from above, drifting forward, vertical 9:16, no text.`

## Ролик 09 · Финал: телефон и палец · 8 с · кадр 13

**Первый кадр.** `[STYLE] Strictly top-down 90-degree shot of the same wooden desk from clip 01, night, the smartphone centered with its glowing blank teal-violet screen facing the camera, the closed laptop edge and a sticky note at the frame edges, soft violet ambient light. Vertical 9:16, phone large in frame.`

**Последний кадр.** `[STYLE] The camera has tilted from top-down to a frontal low angle: the phone now stands upright toward the viewer on the desk, screen glowing, a viewer's fingertip (not Mira's, a neutral hand entering from the bottom edge) lifting away after a tap, a soft teal flash fading, the dark room behind. Vertical 9:16.`

**Движение.** Hold top-down, the finger enters from the bottom and taps, flash, then the camera tilts from 90° to frontal in one move; the logo lockup is placed by the site during the tilt.

## Ролик 10 · Поле точек · 12 с · кадр 12

Рендерится сайтом в реальном времени (система частиц). Если нужен видеофайл: `[STYLE] Abstract dark void, a dense regular field of thousands of tiny dim navy dots; about four thousand of them glow bright teal in a cluster at center; the camera pulls back exponentially revealing millions more dark dots stretching to every edge; then a few dark dots near the center begin lighting up violet one after another. Vertical 9:16, no text, pure particles, slow and precise.`

---

## Порядок работы в Vifix

1. Сгенерировать референс Миры (анфас, нейтральный свет, два образа: худи и платье). Утвердить.
2. Для роликов 01–07 и 09 сгенерировать первый и последний кадр по промтам выше с референсом Миры; 9:16, 1080×1920 или выше.
3. Проверить пары кадров на консистентность: стол, лампа, телефон, цвет кожи, серьги. Перегенерировать расходящиеся.
4. Image-to-video по паре кадров с описанием движения из блока «Движение», длительность из заголовка. Там, где лимит 8–10 с (ролики 02, 03, 04, 06), делить на две части по описанной склейке.
5. Ролик 08: кадрировать готовый футаж карты. Ролик 10: при желании отрендерить, иначе оставить сайту.
6. Сложить в `film/landing/video/clip-NN.mp4` и прописать `VIDEO` в `template.html`, собрать `build.py`.
