#!/usr/bin/env python3
"""Contrast evidence for docs/stages/2-design-system.md.

Every ratio in the spec's contrast table comes from this script:
  python3 scripts/design/contrast_tokens.py            # markdown table
Scales are the spec's fixed values (not regenerated). Tailwind v4 status colours are
the published v4 sRGB values. Translucent fills are alpha-blended over their ground.
"""
from __future__ import annotations

PAL = {
    "civic": {50: "#EDF5FE", 100: "#DAE8FB", 200: "#BCD6F7", 300: "#95BDEF", 400: "#6D9FDE", 500: "#4A82C6",
              600: "#3067A9", 700: "#1C508C", 800: "#0B3A6E", 900: "#042851", 950: "#011735"},
    "action": {50: "#E9F4FC", 100: "#D3E9FA", 200: "#B1D8F7", 300: "#83C1F0", 400: "#51A5E0", 500: "#1E88C8",
               600: "#0B6FA7", 700: "#085A88", 800: "#03456B", 900: "#00324F", 950: "#011F34"},
    "locator": {50: "#FFFBEA", 100: "#FFF4CC", 200: "#FEE9A8", 300: "#FFD67E", 400: "#F2B705", 500: "#CB9A13",
                600: "#A77F12", 700: "#89670F", 800: "#6C5007", 900: "#503B03", 950: "#362600"},
    "slate": {50: "#F4F7FA", 100: "#E4ECF6", 200: "#D0DAE7", 300: "#B7C2D1", 400: "#99A6B6", 500: "#7D8A9B",
              600: "#657182", 700: "#505C6B", 800: "#3D4755", 900: "#2A343F", 950: "#19212B"},
    # Tailwind CSS v4 defaults (sRGB fallbacks of the oklch values)
    "amber": {100: "#FEF3C6", 500: "#FE9A00", 700: "#BB4D00", 800: "#973C00"},
    "red": {100: "#FFE2E2", 500: "#FB2C36", 700: "#C10007", 800: "#9F0712"},
    "green": {100: "#DCFCE7", 500: "#00C950", 700: "#008236", 800: "#016630"},
    "cyan": {100: "#CEFAFE", 200: "#A2F4FD", 300: "#53EAFD"},
}
INK = "#12202E"
WHITE = "#FFFFFF"
SCANS = {"light scan #F2EEE4": "#F2EEE4", "yellowed scan #C9B98F": "#C9B98F",
         "dark scan #6B5E45": "#6B5E45", "very dark scan #2A2620": "#2A2620"}


def c(name: str) -> str:
    fam, step = name.rsplit("-", 1)
    return PAL[fam][int(step)]


def _lin(v: float) -> float:
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def rgb(h: str) -> list:
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lum(h: str) -> float:
    r, g, b = (_lin(x) for x in rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a: str, b: str) -> float:
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def blend(fg: str, alpha: float, bg: str) -> str:
    f, b = rgb(fg), rgb(bg)
    return "#" + "".join(f"{round((alpha * x + (1 - alpha) * y) * 255):02X}" for x, y in zip(f, b))


def best_of(strokes: list, ground: str) -> float:
    """A dual-tone stroke is visible when its stronger tone clears 3:1."""
    return max(ratio(s, ground) for s in strokes)


ROWS = [
    # (label, foreground, background, minimum)
    ("White text on rail/header (civic-800)", WHITE, c("civic-800"), 4.5),
    ("White text on rail active/hover (civic-700)", WHITE, c("civic-700"), 4.5),
    ("Rail group labels civic-200 on civic-800", c("civic-200"), c("civic-800"), 4.5),
    ("Focus ring on civic: white outline on civic-800", WHITE, c("civic-800"), 3.0),
    ("Focus ring on civic: white outline on civic-700", WHITE, c("civic-700"), 3.0),
    ("Header search field: fill civic-900, text white", WHITE, c("civic-900"), 4.5),
    ("Header search placeholder civic-200 on civic-900", c("civic-200"), c("civic-900"), 4.5),
    ("Header search field border civic-400 vs civic-800", c("civic-400"), c("civic-800"), 3.0),
    ("Focus ring action-600 on white", c("action-600"), WHITE, 3.0),
    ("Focus ring action-600 on ground", c("action-600"), c("slate-50"), 3.0),
    ("White on primary button (action-600)", WHITE, c("action-600"), 4.5),
    ("Links text-primary (action-600) on ground", c("action-600"), c("slate-50"), 4.5),
    ("Links text-primary (action-600) on white", c("action-600"), WHITE, 4.5),
    ("Body ink on ground", INK, c("slate-50"), 4.5),
    ("Body ink on white", INK, WHITE, 4.5),
    ("Plate-colour text civic-800 on ground", c("civic-800"), c("slate-50"), 4.5),
    ("Toned slate-800 on elevated", c("slate-800"), c("slate-100"), 4.5),
    ("Muted slate-700 on elevated", c("slate-700"), c("slate-100"), 4.5),
    ("Muted slate-700 on white", c("slate-700"), WHITE, 4.5),
    ("Dimmed slate-600 on ground", c("slate-600"), c("slate-50"), 4.5),
    ("Dimmed slate-600 on white", c("slate-600"), WHITE, 4.5),
    ("Control border (--ui-border-accented slate-600) on white", c("slate-600"), WHITE, 3.0),
    ("Control border slate-600 on ground", c("slate-600"), c("slate-50"), 3.0),
    ("Control border slate-600 on elevated", c("slate-600"), c("slate-100"), 3.0),
    ("Control border slate-600 on scan-pane", c("slate-600"), c("slate-200"), 3.0),
    ("Switch track off (--ui-bg-accented slate-600) on white", c("slate-600"), WHITE, 3.0),
    ("Switch track off slate-600 on elevated", c("slate-600"), c("slate-100"), 3.0),
    ("Rail link hover: white on civic-700", WHITE, c("civic-700"), 4.5),
    ("Rail link icon idle: civic-200 on civic-800", c("civic-200"), c("civic-800"), 3.0),
    ("Rail link icon active/hover: white on civic-700", WHITE, c("civic-700"), 3.0),
    ("Rail link focus ring: white on civic-800", WHITE, c("civic-800"), 3.0),
    ("Header ghost button focus/active: white icon on civic-700", WHITE, c("civic-700"), 3.0),
    ("ЕАИС down text: white on civic-800", WHITE, c("civic-800"), 4.5),
    ("Progress/slider indicator action-600 on meter-track slate-200", c("action-600"), c("slate-200"), 3.0),
    ("Inverted badge: white on slate-700", WHITE, c("slate-700"), 4.5),
    ("--ui-warning amber-800 text on white", c("amber-800"), WHITE, 4.5),
    ("Warning soft badge: amber-800 on amber-800/10 over white", c("amber-800"), blend(c("amber-800"), .10, WHITE), 4.5),
    ("Warning solid badge: white on amber-800", WHITE, c("amber-800"), 4.5),
    ("Low-conf word fill: ink on amber-100", INK, c("amber-100"), 4.5),
    ("--ui-error red-800 text on white", c("red-800"), WHITE, 4.5),
    ("Error soft badge: red-800 on red-800/10 over white", c("red-800"), blend(c("red-800"), .10, WHITE), 4.5),
    ("Error solid badge: white on red-800", WHITE, c("red-800"), 4.5),
    ("--ui-success green-800 text on white", c("green-800"), WHITE, 4.5),
    ("Success soft badge: green-800 on green-800/10 over white", c("green-800"), blend(c("green-800"), .10, WHITE), 4.5),
    ("Success solid badge: white on green-800", WHITE, c("green-800"), 4.5),
    ("Secondary (plate) badge: white on civic-800", WHITE, c("civic-800"), 4.5),
    ("Secondary soft: civic-800 on civic-800/10 over white", c("civic-800"), blend(c("civic-800"), .10, WHITE), 4.5),
    ("Search hit <mark>: ink on cyan-200", INK, c("cyan-200"), 4.5),
    ("Ink on locator-400 (text on gold)", INK, c("locator-400"), 4.5),
    ("Pin ink ring vs white", INK, WHITE, 3.0),
    ("Confidence meter fill slate-700 on slate-200 track", c("slate-700"), c("slate-200"), 3.0),
    ("Rail active marker: white bar on civic-700", WHITE, c("civic-700"), 3.0),
    ("Status on civic: ЕАИС text white on civic-800", WHITE, c("civic-800"), 4.5),
    ("Status on civic: solid error badge white on red-800", WHITE, c("red-800"), 4.5),
    ("Status dot white ring on civic-800", WHITE, c("civic-800"), 3.0),
    ("Plate focus ring action-600 on white band", c("action-600"), WHITE, 3.0),
    ("Low-conf text cue: amber-800 dashed underline on white", c("amber-800"), WHITE, 3.0),
    ("Low-conf text cue: amber-800 underline on amber-100 fill", c("amber-800"), c("amber-100"), 3.0),
    ("Corrected marker: slate-600 dotted underline on white", c("slate-600"), WHITE, 3.0),
    ("Scan line numbers text-muted (slate-700) on scan-pane", c("slate-700"), c("slate-200"), 4.5),
    ("Error soft badge on elevated: red-800 on red/10 over slate-100", c("red-800"), blend(c("red-800"), .10, c("slate-100")), 4.5),
    ("Warning soft badge on elevated: amber-800 on amber/10 over slate-100", c("amber-800"), blend(c("amber-800"), .10, c("slate-100")), 4.5),
    ("Neutral soft badge (queued/pending): slate-700 on slate/10 over white", c("slate-700"), blend(c("slate-700"), .10, WHITE), 4.5),
]

DUAL = [
    ("Overlay outline (white halo + ink core)", [WHITE, INK]),
    ("Leader line (locator-400 casing + ink core)", [c("locator-400"), INK]),
    ("Locator pin (locator-400 fill + ink ring)", [c("locator-400"), INK]),
]


def main() -> None:
    print("| Pair | Ratio | Needs | Result |\n|---|---|---|---|")
    fails = 0
    for label, fg, bg, need in ROWS:
        r = ratio(fg, bg)
        ok = r >= need
        fails += not ok
        print(f"| {label} | {r:.2f} | {need:g} | {'pass' if ok else 'FAIL'} |")
    print("\n| Dual-tone stroke | " + " | ".join(SCANS) + " |\n|---|" + "---|" * len(SCANS))
    for label, strokes in DUAL:
        vals = [best_of(strokes, g) for g in SCANS.values()]
        fails += sum(v < 3 for v in vals)
        print(f"| {label} | " + " | ".join(f"{v:.2f}" for v in vals) + " |")
    print(f"\n{fails} failing pair(s)")


if __name__ == "__main__":
    main()
