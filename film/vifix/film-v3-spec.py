#!/usr/bin/env python3
"""AppHUB Film v3 · спека воркфлоу Vifix: лист персонажа, 17 ключевых кадров 9:16, 9 клипов Kling.

Источник промптов — film/SHOTLIST.md (раскадровка v2.3). Отличия от шот-листа:
- каждый ролик — один клип Kling 10 с без деления: сайт листает кадры скроллом, длительность задаёт скролл;
- ролик 08 — новый переход «звёзды собираются в сеть» (футаж карты горизонтальный, в 9:16 не кадрируется);
- ролик 10 (поле точек) рисует сайт.

    python3 film/vifix/film-v3-spec.py         # сводка
    python3 film/vifix/film-v3-spec.py --json  # план нод и связей для MCP
"""
import json, sys

STYLE = ("Cinematic vertical 9:16 frame, premium dark film look. Palette: deep navy-black shadows (#0A0A14), "
         "teal screen light (#00E0C7) as the only cold accent, violet practical lights (#7C3AFF) in night exteriors, "
         "warm amber desk lamp (#FFB547) indoors. Anamorphic lens character, shallow depth of field, soft bloom on light "
         "sources, fine film grain, slight vignette. Photoreal, 35mm film, no text, no logos, no watermark, no UI on screens "
         "(screens glow blank teal). Mood: Apple meets Telegram, quiet, expensive, precise.")
NEGATIVE = ("text, letters, watermark, logo, UI elements, readable screen content, cartoon, illustration, oversaturated, "
            "HDR look, lens flare streaks, extra fingers, deformed hands, duplicate phone, horizontal composition, 16:9")
MIRA = ("Mira, woman around 28, Eastern European features, dark hair in a loose messy bun with strands falling out, no makeup, "
        "tired but beautiful face, small silver stud earrings. Same woman as in the character reference sheet: keep her face, "
        "hair colour, skin tone and earrings identical.")
HOODIE = "She wears an oversized graphite-grey hoodie, sleeves pulled over hands."
DRESS = "She wears a floor-length emerald silk slip dress, hair down and wavy, soft evening makeup, the same small silver stud earrings."
DESK = ("Set continuity: the same night apartment and wooden desk as the reference frame - same amber desk lamp, same open "
        "laptop, same dark smartphone, same mug and yellow sticky notes.")

CHAR_SHEET = ("Character reference sheet, 16:9, plain deep navy-black studio background (#0A0A14), three views of the SAME woman "
              "side by side, photoreal, identical face in all three: (1) left - tight frontal head-and-shoulders portrait looking "
              "into the lens, neutral soft key light; (2) centre - full-length standing, oversized graphite-grey hoodie with sleeves "
              "pulled over hands, dark jeans, hair in a loose messy bun with strands falling out, no makeup; (3) right - full-length "
              "standing, floor-length emerald silk slip dress, hair down and wavy, soft evening makeup. Woman around 28, Eastern "
              "European features, dark hair, tired but beautiful face, small silver stud earrings in all three views. Even soft "
              "studio light with a subtle teal rim from the right, 85mm, fine film grain. No text, no labels, no logos, no watermark.")

# id, подпись, промпт, нужна ли Мира (образ), референсы-кадры (по порядку reference-1..)
F = [
 ("f01a", "01 · начало · стол, она собрана",
  "Night apartment, Mira sits at a desk in front of an open laptop, seen from the side at a three-quarter angle, slightly behind "
  "her shoulder. Warm amber desk lamp top-left is the only light, the laptop screen glows cool blank white-teal onto her face. "
  "A phone lies face down beside the laptop, a mug, two yellow sticky notes. Vertical 9:16: lamp in the upper third, laptop and "
  "her hands in the middle, desk edge at the bottom. She sits upright, focused. 24mm lens, camera at desk height.", "hoodie", []),
 ("f01b", "01 · конец · три часа спустя",
  "Same desk, same framing moved slightly to the right, three hours later: Mira slumped, head resting on her hand, hood half up, "
  "mug empty and tipped over, more sticky notes, the laptop screen brighter and busier but still a blank glow with no readable "
  "content. The lamp has a faint flicker glow. Exhausted, not angry. Vertical 9:16, 24mm.", "hoodie", ["f01a"]),
 ("f02a", "02 · начало · экран и лицо",
  "Extreme close-up on the laptop screen edge and Mira's face lit by cold blue-white screen light, 85mm macro, tight crash-zoom "
  "framing. Her eyes reflect the glow. A thin wisp of smoke begins to rise from the keyboard gap at the bottom of the frame. "
  "Tension, stillness. Vertical 9:16.", "hoodie", ["f01b"]),
 ("f02b", "02 · конец · темно, телефон светится",
  "The same desk in near-total darkness: the laptop lid is closed, lamp off, Mira's silhouette barely visible leaning back out of "
  "focus. The only light in the frame is a small teal glow from a phone lying face up on the desk in the lower third, casting a "
  "soft teal pool on the wood. Everything else black. Silence. Vertical 9:16.", "hoodie", ["f01b"]),
 ("f03a", "03 · начало · телефон макро",
  "Macro 85mm, top-down angled shot of the same dark smartphone lying on the same wooden desk at night, its screen glowing a blank "
  "teal-violet gradient with no UI, soft reflections of the room on the glass, shallow depth of field, the desk edge and a yellow "
  "sticky note out of focus. Vertical 9:16, the phone centred and filling most of the width. Calm, premium product-film lighting.",
  None, ["f02b"]),
 ("f03b", "03 · конец · палец касается экрана",
  "Same phone, same desk, the camera has slowly orbited about 30 degrees clockwise and moved slightly closer; Mira's hand enters "
  "from the bottom of the frame, index finger pressing the lower part of the glowing screen, fingertip lit teal, a soft teal flash "
  "spreading from the touch point. Graphite hoodie sleeve visible at the wrist. Vertical 9:16, 85mm macro.", "hoodie", ["f03a"]),
 ("f04a", "04 · начало · она читает пуши",
  "Medium close-up, 85mm, Mira in the dark room facing slightly down toward the phone out of frame below, her face lit only by "
  "teal phone light from below, eyes moving as if reading notifications, lips slightly parted, tense hope. Vertical 9:16, head and "
  "shoulders, black background with a faint amber rim from the dead lamp.", "hoodie", ["f02b"]),
 ("f04b", "04 · конец · выдох",
  "Mira leaned back in the chair, head tilted back, eyes closed, a slow relieved smile just beginning, shoulders dropped, hands "
  "open in her lap. Teal light now softer and wider, a breath of warmth returning to the skin tones. Camera slightly pulled back "
  "to show the chair. The frame is still. Vertical 9:16, 85mm.", "hoodie", ["f04a"]),
 ("f05a", "05 · начало · глаз",
  "Extreme macro of Mira's eye opening, 100mm macro, vertical 9:16 with the iris filling the width of the frame, dark brown iris "
  "with fine fibres, a single teal catchlight reflecting a phone screen, wet lashes, skin texture visible. Black surroundings.",
  "face", ["f04b"]),
 ("f05b", "05 · конец · внутри зрачка огни",
  "Deep inside the pupil: total black with faint bokeh city lights beginning to appear at the centre, tiny warm amber and violet "
  "points like a night seafront seen from a moving car, out of focus. Nothing else. Vertical 9:16.", None, []),
 ("f06a", "06 · начало · дверь лимузина",
  "Night, seafront boulevard, a black limousine door just opened, Mira stepping out, seen from behind at shoulder height, "
  "steadicam. Ahead: a hotel entrance with a doorman holding the door, a straight red carpet running from the car through the lobby "
  "toward a lit terrace, violet and teal practical lights along the walls, warm amber lamps on columns. Vertical 9:16: the carpet "
  "runs from the bottom edge up to a glowing doorway in the upper third.", "dress", ["f05b"]),
 ("f06b", "06 · конец · терраса, джакузи, первые звёзды",
  "End of the red carpet on a rooftop terrace by the sea at dusk: a lit jacuzzi with steam, string lights, the sea and a "
  "violet-teal horizon. Mira seen from behind and above, the camera has risen to a high angle, lowering herself into the water, "
  "the emerald dress left on a chair, a champagne glass on the rim. Camera tilted upward so the upper half of the frame is "
  "darkening sky with the first stars. Vertical 9:16.", "dress", ["f06a"]),
 ("f07a", "07 · начало · вода сверху",
  "Looking straight down at the surface of the same rooftop jacuzzi water at night, teal underwater light, steam, small ripples, a "
  "few warm reflections of string lights. Vertical 9:16.", None, ["f06b"]),
 ("f07b", "07 · конец · чистое звёздное небо",
  "Looking straight up at a clear night sky over the sea, no moon, dense stars, a faint violet-teal glow at the bottom edge from "
  "the city below, a few stars subtly brighter forming the hint of a constellation. Vertical 9:16, nothing but sky.", None, ["f07a"]),
 ("f08b", "08 · конец · звёзды стали сетью",
  "The same night sky, the stars have reorganised into a calm glowing network: a bright point at the centre and three concentric "
  "rings of teal and violet points around it, thin delicate light lines connecting points between the rings, the rest of the sky "
  "still dark with dim stars. Seen from below looking up, vertical 9:16, elegant and sparse, no text, no labels, no UI.",
  None, ["f07b"]),
 ("f09a", "09 · начало · стол сверху, телефон",
  "Strictly top-down 90-degree shot of the same wooden desk, night, the same smartphone centred with its glowing blank teal-violet "
  "screen facing the camera, the closed laptop edge and a yellow sticky note at the frame edges, soft violet ambient light. "
  "Vertical 9:16, phone large in frame.", None, ["f03a"]),
 ("f09b", "09 · конец · телефон стоит, кончик пальца",
  "The camera has tilted from top-down to a frontal low angle: the same phone now stands upright toward the viewer on the desk, "
  "screen glowing blank teal-violet, a neutral fingertip entering from the bottom edge lifting away after a tap, a soft teal flash "
  "fading, the dark room behind. Vertical 9:16.", None, ["f09a"]),
]

# клип: id, начальный кадр, конечный кадр, движение
C = [
 ("c01", "f01a", "f01b", "Slow lateral dolly from left to right along the desk with a subtle handheld micro-shake. Time passes: Mira "
  "slowly slumps from upright and focused to exhausted, head on her hand, hood half up; sticky notes multiply, the mug tips over, the "
  "lamp flickers faintly. Smooth, continuous, no cuts."),
 ("c02", "f02a", "f02b", "One continuous take: slow push into the screen and her face, handheld shake grows, a thin smoke wisp rises "
  "from the keyboard; she closes the laptop lid in one decisive gesture, the light dies, the lamp goes off, the camera sinks to desk "
  "level and stops; a small teal glow of the phone appears in the dark."),
 ("c03", "f03a", "f03b", "60 fps feel, very slow push-in on the glowing phone, then a small clockwise orbit of about 30 degrees; "
  "Mira's hand enters from the bottom of the frame and her index finger presses the screen, a soft teal flash spreads from the touch "
  "point. Calm and precise."),
 ("c04", "f04a", "f04b", "She watches the phone below the frame with small reactions in her eyes and lips, then leans back in the "
  "chair, closes her eyes and exhales; a relieved smile arrives a second later. The camera slowly retreats with her and comes to rest."),
 ("c05", "f05a", "f05b", "Accelerating push into the eye: slow for the first seconds, then a rush through the iris into the black "
  "pupil, where tiny out-of-focus warm amber and violet city lights begin to appear."),
 ("c06", "f06a", "f06b", "One continuous steadicam take from behind: she steps out of the limousine, walks the straight red carpet "
  "past the doorman, through the glowing lobby and out onto the rooftop terrace, then lowers herself into the steaming jacuzzi; at "
  "the end the camera rises to a high angle and tilts up toward the darkening sky with the first stars. Graceful, unhurried."),
 ("c07", "f07a", "f07b", "Continuous vertical tilt and rise from the steaming water surface up to the open night sky, no cut; the "
  "ripples and steam fall away and only dense stars remain."),
 ("c08", "f07b", "f08b", "Slow drift forward into the night sky; the stars gently slide and settle into three concentric rings "
  "around a bright centre, thin light lines connect them one by one. Quiet, precise, no text."),
 ("c09", "f09a", "f09b", "Hold top-down for a moment; a fingertip enters from the bottom edge and taps the glowing screen, a soft "
  "teal flash; then the camera tilts in one smooth move from 90 degrees top-down to a frontal low angle as the phone stands upright "
  "toward the viewer."),
]

GPT = {"model": "gpt-image-2.5-sunburst", "quality": "high", "resolution": "1k", "aspectRatio": "9:16", "background": "auto"}
KLING = {"version": "3.0", "mode": "pro", "duration": "10", "aspectRatio": "9:16", "cfgScale": 0.3,
         "generateAudio": False, "negativePrompt": NEGATIVE}


def prompt_for(frame):
    fid, label, shot, look, _ = frame
    parts = [shot]
    if look == "hoodie": parts += [MIRA, HOODIE]
    elif look == "dress": parts += [MIRA, DRESS]
    elif look == "face": parts += [MIRA]
    if fid in ("f01a", "f01b", "f02a", "f02b", "f03a", "f03b", "f04a", "f04b", "f09a", "f09b"): parts.append(DESK)
    parts += [STYLE, "Avoid: " + NEGATIVE]
    return "\n\n".join(parts)


def plan():
    CX, nodes, edges = 470, [], []
    def node(i, t, x, y, **d): nodes.append({"id": i, "type": t, "position": {"x": x, "y": y}, "data": d})
    def edge(s, t, th): edges.append({"source": s, "target": t, "sourceHandle": "output", "targetHandle": th})
    node("p-char", "textInput", 0, -900, label="REF · Мира · лист персонажа", text=CHAR_SHEET)
    node("g-char", "gptImage", CX, -900, label="REF · Мира · лист персонажа", **dict(GPT, aspectRatio="16:9"))
    edge("p-char", "g-char", "prompt")
    for n, fr in enumerate(F):
        fid, label, _, look, refs = fr
        x = n * 2 * CX
        node("p-" + fid, "textInput", x, 0, label=label, text=prompt_for(fr))
        node("g-" + fid, "gptImage", x + CX, 0, label=label, **GPT)
        edge("p-" + fid, "g-" + fid, "prompt")
        k = 0
        if look:
            edge("g-char", "g-" + fid, f"reference-{k}"); k += 1
        for r in refs:
            edge("g-" + r, "g-" + fid, f"reference-{k}"); k += 1
    for n, (cid, a, b, motion) in enumerate(C):
        x = n * 2 * CX
        node("p-" + cid, "textInput", x, 900, label=f"Клип {cid[1:]} · движение", text=motion + "\n\n" + STYLE)
        node("k-" + cid, "kling", x + CX, 900, label=f"Клип {cid[1:]}", **KLING)
        edge("p-" + cid, "k-" + cid, "prompt")
        edge("g-" + a, "k-" + cid, "image")
        edge("g-" + b, "k-" + cid, "end_image")
    return nodes, edges


if __name__ == "__main__":
    nodes, edges = plan()
    if "--json" in sys.argv:
        print(json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False))
    else:
        from collections import Counter
        print(len(nodes), "нод", dict(Counter(n["type"] for n in nodes)), "·", len(edges), "связей")
        print("кадров:", len(F) + 1, "· клипов:", len(C), "· оценка кредитов:", round((len(F) + 1) * 4.6 + len(C) * 130.7))
