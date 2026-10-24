#!/usr/bin/env python3
"""Generate every SnapVocab brand asset from one geometry definition.

The logo is a speech bubble with a camera lens inside it: the app turns a
photo into words you can hear, so the mark puts the lens inside the bubble
rather than next to it. The teal lens core is the palette's accent colour and
the only warm note in an otherwise indigo mark, which is what makes it
recognisable at icon size.

Run after changing any constant below:

    python3 scripts/generate-brand-assets.py

It rewrites assets/images/*.png, assets/logo/*.svg and the mark inside
assets/expo.icon/, so those files are build output kept in git — never edit
them by hand. Needs Pillow and numpy (`pip3 install pillow numpy`); neither is
an app dependency, nothing at runtime imports this.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "assets" / "images"
LOGO = ROOT / "assets" / "logo"
EXPO_ICON = ROOT / "assets" / "expo.icon"

# --- Palette ---------------------------------------------------------------
# Mirrors src/constants/colors.ts. The two hero stops are the same values the
# in-app gradient header uses, so the icon and the top of the screen are
# literally the same surface.
HERO_STOPS = ((0.0, (0x5B, 0x5F, 0xEF)), (0.58, (0x7B, 0x5C, 0xF5)), (1.0, (0x8B, 0x5C, 0xF6)))
WHITE = (0xFF, 0xFF, 0xFF, 0xFF)
LENS_RING = (0x43, 0x38, 0xCA, 0xFF)  # deep indigo: reads on white and on the gradient
LENS_CORE = (0x18, 0xB8, 0x92, 0xFF)  # SnapVocabColors.accent
TRANSPARENT = (0xFF, 0xFF, 0xFF, 0x00)

# --- Geometry --------------------------------------------------------------
# One 1024-unit design space. Everything else is this, scaled.
SPACE = 1024
SS = 4  # supersampling factor; shapes are drawn 4x and downsampled for edges

BUBBLE = (216, 220, 776, 712)
BUBBLE_RADIUS = 140
# Tail: a quad narrowing from the bubble's flat bottom edge to a tip, capped by
# a circle. The quad's far edge is exactly the circle's diameter and sits
# perpendicular to the tail's axis, so the cap rounds the tip off instead of
# bulging out of it the way a circle on a pointed triangle would.
TAIL_BASE = ((398, 688), (548, 688))
TAIL_TIP = (392, 778)
TAIL_TIP_RADIUS = 22
LENS_CENTER = (496, 466)
LENS_OUTER = 144
LENS_CORE_RADIUS = 84
# A glint on the glass, which is what makes the circle read as a lens rather
# than as a dot. It is dropped from the knockout mark, where the core is white.
GLINT_CENTER = (462, 432)
GLINT_RADIUS = 21
# Four-point star just off the bubble's shoulder — the "analysed by AI" note.
# It stays clear of the bubble's corner arc so the two whites never merge.
SPARKLE_CENTER = (846, 236)
SPARKLE_OUTER = 68
SPARKLE_INNER = 19

# How much of an icon's width the mark spans, leaving the OS room to mask.
ICON_CONTENT = 0.60

# The drawn extent of the mark, used to centre it on every canvas.
CONTENT_BOX = (
    BUBBLE[0],
    SPARKLE_CENTER[1] - SPARKLE_OUTER,
    SPARKLE_CENTER[0] + SPARKLE_OUTER,
    TAIL_TIP[1] + TAIL_TIP_RADIUS,
)


def _circle(center: tuple[float, float], radius: float) -> tuple[float, float, float, float]:
    cx, cy = center
    return (cx - radius, cy - radius, cx + radius, cy + radius)


def _tail_points() -> list[tuple[float, float]]:
    """The tail as a quad: both base corners, then the tip's rounded edge."""
    (bx1, by1), (bx2, by2) = TAIL_BASE
    tx, ty = TAIL_TIP
    axis_x, axis_y = tx - (bx1 + bx2) / 2, ty - (by1 + by2) / 2
    length = math.hypot(axis_x, axis_y)
    # Perpendicular to the axis, scaled to the cap's radius.
    px, py = -axis_y / length * TAIL_TIP_RADIUS, axis_x / length * TAIL_TIP_RADIUS
    return [(bx1, by1), (bx2, by2), (tx - px, ty - py), (tx + px, ty + py)]


def _sparkle_points() -> list[tuple[float, float]]:
    """Eight alternating points: the star's tips and the waists between them."""
    cx, cy = SPARKLE_CENTER
    points = []
    for step in range(8):
        angle = math.pi / 2 * (step / 2) - math.pi / 2
        radius = SPARKLE_OUTER if step % 2 == 0 else SPARKLE_INNER
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def render_mark(width: int, *, knockout: bool = False) -> Image.Image:
    """The mark alone, on transparency, cropped to `CONTENT_BOX` at `width` px.

    `knockout` drops the two lens colours and cuts the ring out of the alpha
    instead, leaving a single-colour silhouette: that is what Android's themed
    icon and Apple's Icon Composer layer need, and over the gradient it still
    reads as a lens because the background shows through the cut.
    """
    canvas = SPACE * SS
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def s(box):
        return [v * SS for v in box]

    draw.rounded_rectangle(s(BUBBLE), radius=BUBBLE_RADIUS * SS, fill=WHITE)
    draw.polygon([(x * SS, y * SS) for x, y in _tail_points()], fill=WHITE)
    draw.ellipse(s(_circle(TAIL_TIP, TAIL_TIP_RADIUS)), fill=WHITE)

    # ImageDraw writes raw pixels on RGBA rather than compositing, so filling
    # with a zero alpha punches a hole rather than painting nothing.
    ring_fill = TRANSPARENT if knockout else LENS_RING
    core_fill = WHITE if knockout else LENS_CORE
    draw.ellipse(s(_circle(LENS_CENTER, LENS_OUTER)), fill=ring_fill)
    draw.ellipse(s(_circle(LENS_CENTER, LENS_CORE_RADIUS)), fill=core_fill)
    if not knockout:
        draw.ellipse(s(_circle(GLINT_CENTER, GLINT_RADIUS)), fill=(0xFF, 0xFF, 0xFF, 0x99))

    draw.polygon([(x * SS, y * SS) for x, y in _sparkle_points()], fill=WHITE)

    cropped = img.crop(tuple(v * SS for v in CONTENT_BOX))
    height = round(width * cropped.height / cropped.width)
    return cropped.resize((width, height), Image.LANCZOS)


def gradient(size: int, angle_deg: float = 180.0, stops=HERO_STOPS) -> Image.Image:
    """A CSS-style linear gradient, so the icon can reuse the hero's stops."""
    angle = math.radians(angle_deg)
    dx, dy = math.sin(angle), -math.cos(angle)
    length = abs(size * dx) + abs(size * dy)

    ys, xs = np.mgrid[0:size, 0:size].astype(np.float64)
    t = ((xs - size / 2) * dx + (ys - size / 2) * dy) / length + 0.5
    t = np.clip(t, 0.0, 1.0)

    offsets = np.array([stop[0] for stop in stops])
    channels = [np.interp(t, offsets, [stop[1][i] for stop in stops]) for i in range(3)]
    rgb = np.stack(channels + [np.full_like(t, 255.0)], axis=-1)
    return Image.fromarray(rgb.round().astype(np.uint8), "RGBA")


def _highlight(size: int) -> Image.Image:
    """A soft light from the upper left, so the flat gradient gains a surface."""
    ys, xs = np.mgrid[0:size, 0:size].astype(np.float64) / size
    distance = np.hypot(xs - 0.28, ys - 0.14) / 0.85
    alpha = np.clip(1.0 - distance, 0.0, 1.0) ** 2 * 46.0
    rgba = np.dstack([np.full((size, size), 255.0)] * 3 + [alpha])
    return Image.fromarray(rgba.round().astype(np.uint8), "RGBA")


def background(size: int, *, radius_ratio: float | None = None) -> Image.Image:
    """The gradient tile every icon sits on, optionally rounded itself.

    Platform icons are masked by the OS, so they stay square (`radius_ratio`
    None); a favicon is not masked, so it carries its own squircle.
    """
    tile = Image.alpha_composite(gradient(size), _highlight(size))
    if radius_ratio is None:
        return tile
    mask = Image.new("L", (size * SS, size * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size * SS - 1, size * SS - 1), radius=size * SS * radius_ratio, fill=255
    )
    tile.putalpha(mask.resize((size, size), Image.LANCZOS))
    return tile


def compose(size: int, content_ratio: float, *, radius_ratio: float | None = None) -> Image.Image:
    """Gradient tile with the mark centred across `content_ratio` of its width."""
    tile = background(size, radius_ratio=radius_ratio)
    mark = render_mark(round(size * content_ratio))
    tile.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return tile


def centred_mark(size: int, content_ratio: float, *, knockout: bool = False) -> Image.Image:
    """The mark on transparency, centred on a square canvas."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mark = render_mark(round(size * content_ratio), knockout=knockout)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def glow(size: int = 604) -> Image.Image:
    """The halo that spins behind the mark in the animated splash.

    Three lobes around the circle, so a slow rotation reads as movement, with
    the centre left empty because the mark covers it.
    """
    ys, xs = (np.mgrid[0:size, 0:size].astype(np.float64) - size / 2) / (size / 2)
    radius = np.hypot(xs, ys)
    theta = np.arctan2(ys, xs)

    lobes = (np.sin(3 * theta) + 1) / 2
    band = np.clip(1 - np.abs((radius - 0.46) / 0.46), 0, 1) ** 1.3
    alpha = band * (0.62 + 0.38 * lobes) * 225

    mix = (np.sin(3 * theta + 1.1) + 1) / 2 * 0.55
    violet, teal = np.array([0x9F, 0x7A, 0xFA]), np.array([0x2F, 0xD3, 0xAC])
    rgb = [violet[i] + (teal[i] - violet[i]) * mix for i in range(3)]
    halo = Image.fromarray(np.dstack(rgb + [alpha]).round().astype(np.uint8), "RGBA")
    # Blurred rather than drawn sharp: the lobes should read as one soft halo
    # turning behind the mark, not as three separate blobs.
    return halo.filter(ImageFilter.GaussianBlur(size * 0.06))


# --- SVG -------------------------------------------------------------------
# Apple's Icon Composer takes SVG layers, so the geometry is emitted as SVG as
# well. Every shape is its own element rather than one path with several
# subpaths: Apple's SVG renderer treats a multi-subpath path as even-odd, so
# the tail would punch a hole where it overlaps the bubble instead of merging
# with it. Overlapping elements composite the same way in every renderer.


def _hex(colour: tuple[int, int, int, int]) -> str:
    return "#%02X%02X%02X" % colour[:3]


def _points(pairs) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pairs)


def _mark_shapes(indent: str) -> str:
    left, top, right, bottom = BUBBLE
    cx, cy = LENS_CENTER
    shapes = [
        f'<rect x="{left}" y="{top}" width="{right - left}" height="{bottom - top}"'
        f' rx="{BUBBLE_RADIUS}" fill="#FFFFFF"/>',
        f'<polygon points="{_points(_tail_points())}" fill="#FFFFFF"/>',
        f'<circle cx="{TAIL_TIP[0]}" cy="{TAIL_TIP[1]}" r="{TAIL_TIP_RADIUS}" fill="#FFFFFF"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{LENS_OUTER}" fill="{_hex(LENS_RING)}"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{LENS_CORE_RADIUS}" fill="{_hex(LENS_CORE)}"/>',
        f'<circle cx="{GLINT_CENTER[0]}" cy="{GLINT_CENTER[1]}" r="{GLINT_RADIUS}"'
        ' fill="#FFFFFF" opacity="0.6"/>',
        f'<polygon points="{_points(_sparkle_points())}" fill="#FFFFFF"/>',
    ]
    return "".join(f"{indent}{shape}\n" for shape in shapes)


def _fit_transform() -> str:
    """Place the mark on a 1024 canvas exactly as the PNGs place it."""
    scale = SPACE * ICON_CONTENT / (CONTENT_BOX[2] - CONTENT_BOX[0])
    tx = SPACE / 2 - (CONTENT_BOX[0] + CONTENT_BOX[2]) / 2 * scale
    ty = SPACE / 2 - (CONTENT_BOX[1] + CONTENT_BOX[3]) / 2 * scale
    return f"translate({tx:.2f} {ty:.2f}) scale({scale:.4f})"


HEADER = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">\n'
    "  <!-- Generated by scripts/generate-brand-assets.py - do not edit. -->\n"
)


def mark_svg() -> str:
    """The mark alone — the layer Icon Composer draws over its own gradient."""
    return (
        HEADER + f'  <g transform="{_fit_transform()}">\n' + _mark_shapes("    ") + "  </g>\n</svg>\n"
    )


def logo_svg() -> str:
    """The whole icon, for READMEs and store listings."""
    stops = "".join(
        f'      <stop offset="{offset}" stop-color="#{r:02X}{g:02X}{b:02X}"/>\n'
        for offset, (r, g, b) in HERO_STOPS
    )
    return (
        HEADER
        + "  <defs>\n"
        + '    <linearGradient id="hero" x1="0" y1="0" x2="0" y2="1">\n'
        + stops
        + "    </linearGradient>\n  </defs>\n"
        + '  <rect width="1024" height="1024" rx="232" fill="url(#hero)"/>\n'
        + f'  <g transform="{_fit_transform()}">\n'
        + _mark_shapes("    ")
        + "  </g>\n</svg>\n"
    )


def main() -> None:
    LOGO.mkdir(parents=True, exist_ok=True)

    # Platform icons. The OS masks these, so they are square and full bleed,
    # and the mark stays well inside the corners it may round away.
    compose(1024, ICON_CONTENT).save(IMAGES / "icon.png")
    background(512).save(IMAGES / "android-icon-background.png")
    # Android splits its icon in two: 108dp of canvas with only the inner 72dp
    # guaranteed to survive the launcher's mask, so the foreground mark is much
    # smaller than it looks here.
    centred_mark(512, 0.44).save(IMAGES / "android-icon-foreground.png")
    centred_mark(432, 0.44, knockout=True).save(IMAGES / "android-icon-monochrome.png")
    # A favicon is never masked, so it brings its own squircle.
    compose(64, 0.66, radius_ratio=0.22).save(IMAGES / "favicon.png")

    # In-app: the mark over surfaces that are already the hero gradient.
    centred_mark(512, 0.92).save(IMAGES / "logo-mark.png")
    glow().save(IMAGES / "logo-glow.png")

    (LOGO / "snapvocab-logo.svg").write_text(logo_svg())
    (LOGO / "snapvocab-mark.svg").write_text(mark_svg())
    (EXPO_ICON / "Assets" / "snapvocab-mark.svg").write_text(mark_svg())

    print("brand assets written")


if __name__ == "__main__":
    main()
