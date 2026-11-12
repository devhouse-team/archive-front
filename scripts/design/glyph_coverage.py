"""Glyph coverage of the bundled fonts: Kazakh Cyrillic, Yanalif (Kazakh Latin 1929-1940), Töte (Kazakh Arabic).

Two modes:
  python3 scripts/design/glyph_coverage.py --check
      Reads the woff2 files the app actually ships (the @fontsource subsets imported in
      app/assets/css/main.css) from node_modules and fails if coverage drops below the Stage 2 baseline.
  python3 scripts/design/glyph_coverage.py <root>
      Stage 2 survey mode: <root>/<family>/package/files/*-400-normal.woff2 (unpacked npm tarballs).
"""
import glob
import os
import site
import sys

sys.path.append(site.getusersitepackages())
from fontTools.ttLib import TTFont  # noqa: E402

KK = set("әғқңөұүһіӘҒҚҢӨҰҮҺІ")
YAN = set("əƏƣƢꞑꞐɵƟƶƵƅƄçÇşŞı")
ARB = set("ڭۆۋەٴىگقعه")

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
NM = os.path.join(ROOT, "node_modules")

# Shipped faces: package dir and the exact subset files main.css bundles.
FACES = {
    "fira-sans": ("@fontsource/fira-sans", [f"fira-sans-{s}-400-normal.woff2" for s in ("cyrillic", "cyrillic-ext", "latin", "latin-ext")]),
    "fira-sans-condensed": ("@fontsource/fira-sans-condensed", [f"fira-sans-condensed-{s}-500-normal.woff2" for s in ("cyrillic", "cyrillic-ext", "latin", "latin-ext")]),
    "noto-sans": ("@fontsource-variable/noto-sans", [f"noto-sans-{s}-wght-normal.woff2" for s in ("cyrillic-ext", "latin-ext")]),
    "noto-naskh-arabic": ("@fontsource-variable/noto-naskh-arabic", ["noto-naskh-arabic-arabic-wght-normal.woff2"]),
}

# Font stacks from main.css @theme (--font-sans, --font-plate, --font-arabic): glyphs resolve per character.
STACKS = {
    "--font-sans": ["fira-sans", "noto-sans", "noto-naskh-arabic"],
    "--font-plate": ["fira-sans-condensed", "fira-sans", "noto-sans"],
    "--font-arabic": ["noto-naskh-arabic", "fira-sans"],
}

# Baseline from docs/stages/2-design-system.md §Type (2026-11-12). (set name, minimum covered)
FACE_MIN = {
    "fira-sans": {"KK": 18, "YAN": 15},
    "fira-sans-condensed": {"KK": 18, "YAN": 15},
    "noto-naskh-arabic": {"ARB": 10},
}
STACK_MIN = {
    "--font-sans": {"KK": 18, "YAN": 17},
    "--font-plate": {"KK": 18, "YAN": 17},
    "--font-arabic": {"ARB": 10},
}
SETS = {"KK": KK, "YAN": YAN, "ARB": ARB}


def cmap_of(paths):
    cmap = set()
    for p in paths:
        cmap |= {chr(c) for c in TTFont(p).getBestCmap()}
    return cmap


def cov(s, cmap):
    missing = "".join(sorted(s - cmap))
    return len(s & cmap), f"{len(s & cmap)}/{len(s)}" + (f" miss:{missing}" if missing else "")


def check():
    failures = []
    cmaps = {}
    print("Shipped faces (node_modules, subsets imported in main.css):")
    for face, (pkg, files) in FACES.items():
        paths = [os.path.join(NM, pkg, "files", f) for f in files]
        absent = [p for p in paths if not os.path.exists(p)]
        if absent:
            failures.append(f"{face}: missing files {', '.join(os.path.basename(p) for p in absent)}")
            continue
        cmaps[face] = cmap_of(paths)
        row = {name: cov(s, cmaps[face]) for name, s in SETS.items()}
        print(f"  {face:20} files={len(paths)}  KK {row['KK'][1]:10} YAN {row['YAN'][1]:24} ARB {row['ARB'][1]}")
        for name, need in FACE_MIN.get(face, {}).items():
            if row[name][0] < need:
                failures.append(f"{face} {name} {row[name][0]} < {need}")

    print("Font stacks (first face that has the glyph wins):")
    for stack, faces in STACKS.items():
        union = set().union(*(cmaps.get(f, set()) for f in faces))
        row = {name: cov(s, union) for name, s in SETS.items()}
        print(f"  {stack:20} KK {row['KK'][1]:10} YAN {row['YAN'][1]:24} ARB {row['ARB'][1]}")
        for name, need in STACK_MIN[stack].items():
            if row[name][0] < need:
                failures.append(f"{stack} {name} {row[name][0]} < {need}")

    if failures:
        print("check:glyphs FAILED")
        for f in failures:
            print("  " + f)
        return 1
    print("check:glyphs passed")
    return 0


def survey(root):
    for fam in sorted(os.listdir(root)):
        paths = glob.glob(f"{root}/{fam}/package/files/*-400-normal.woff2")
        cmap = cmap_of(paths)
        print(f"{fam:20} files={len(paths):2} KK {cov(KK, cmap)[1]:10} YAN {cov(YAN, cmap)[1]:24} ARB {cov(ARB, cmap)[1]}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] != "--check":
        survey(sys.argv[1])
    else:
        sys.exit(check())
