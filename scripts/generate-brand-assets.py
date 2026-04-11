#!/usr/bin/env python3
"""
Generate app icon and launch screen PNGs.
Design: dark luxury command-center — globe wireframe, heavier A mark.
"""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Palette ───────────────────────────────────────────────────────────────────
BG       = (4,   5,   7)
GOLD     = (196, 148, 41)   # #C49429
GOLD_DIM = (72,  55,  15)   # very dark gold — globe wireframe
GOLD_MID = (128, 112, 89)   # #807059 — ring outline / brackets / ticks

FUTURA_BOLD = "/System/Library/Fonts/Supplemental/Futura.ttc"
FUTURA_IDX  = 2   # Bold
FUTURA_MED  = 0   # Medium


# ── Vector helpers ────────────────────────────────────────────────────────────

def _norm(dx, dy):
    d = math.hypot(dx, dy)
    return (dx/d, dy/d) if d > 1e-10 else (0.0, 0.0)

def _cross(ax, ay, bx, by):
    return ax*by - ay*bx


# ── Ellipse ring (annulus) polygon ────────────────────────────────────────────

def ellipse_band(cx, cy, ra, rb, stroke, sides=240):
    """
    Returns an annular polygon for a stroked ellipse.
    Computes normal offsets along the ellipse — no erase pass needed.
    ra = horizontal semi-axis, rb = vertical semi-axis.
    """
    h = stroke / 2.0
    outer, inner = [], []
    for i in range(sides):
        t   = 2 * math.pi * i / sides
        ct, st = math.cos(t), math.sin(t)
        x   = cx + ra * ct
        y   = cy + rb * st
        # outward normal: d/dt(ellipse) = (-ra*st, rb*ct), normal = (rb*ct, ra*st)
        nx, ny = _norm(rb * ct, ra * st)
        outer.append((x + nx * h, y + ny * h))
        inner.append((x - nx * h, y - ny * h))
    return outer + list(reversed(inner))


def circle_band(cx, cy, r, stroke, sides=360):
    return ellipse_band(cx, cy, r, r, stroke, sides)


# ── Globe wireframe ───────────────────────────────────────────────────────────

def draw_globe(draw, cx, cy, R, ring_stroke, line_stroke, foreshorten=0.34):
    """
    Draw a full globe wireframe:
      • Circle outline — GOLD_MID
      • Latitude parallels — GOLD_DIM
      • Longitude meridians — GOLD_DIM
    """
    # Latitude parallels at every 22.5° = 7 lines (excl. poles)
    lat_angles = [22.5, 45.0, 67.5]   # degrees above/below equator
    # Equator
    equator = ellipse_band(cx, cy, R, R * foreshorten, line_stroke)
    draw.polygon(equator, fill=GOLD_DIM)

    for phi_deg in lat_angles:
        phi = math.radians(phi_deg)
        dy  = R * math.sin(phi) * foreshorten / math.sin(math.radians(90))
        # More natural: y-offset proportional to sin(phi), scaled by foreshorten
        dy  = R * math.sin(phi) * foreshorten
        ra  = R * math.cos(phi)
        rb  = ra * foreshorten
        for sign in (+1, -1):
            band = ellipse_band(cx, cy + sign * R * math.sin(phi),
                                ra, rb, line_stroke)
            draw.polygon(band, fill=GOLD_DIM)

    # Longitude meridians — vertical ellipses centred on globe centre
    # semi-minor (horizontal) = R * cos(longitude angle)
    lon_cos = [0.87, 0.64, 0.34]   # cos(30°), cos(50°), cos(70°)
    for lc in lon_cos:
        band = ellipse_band(cx, cy, R * lc, R, line_stroke)
        draw.polygon(band, fill=GOLD_DIM)

    # Globe outline ring — drawn on top of wireframe lines
    outline = circle_band(cx, cy, R, ring_stroke)
    draw.polygon(outline, fill=GOLD_MID)


# ── Stroke → polygon (for the A mark) ────────────────────────────────────────

def stroke_poly(pts, width, miter_limit=4.0):
    half = width / 2.0
    n = len(pts)
    if n < 2:
        return []
    segs = []
    for i in range(n-1):
        dx, dy = pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]
        tx, ty = _norm(dx, dy)
        segs.append((tx, ty, -ty, tx))

    L, R = [], []
    _, _, nx, ny = segs[0]
    L.append((pts[0][0]+nx*half, pts[0][1]+ny*half))
    R.append((pts[0][0]-nx*half, pts[0][1]-ny*half))

    for i in range(1, n-1):
        tx0, ty0, nx0, ny0 = segs[i-1]
        tx1, ty1, nx1, ny1 = segs[i]
        px, py = pts[i]
        c = _cross(tx0, ty0, tx1, ty1)

        def mpt(nax, nay, nbx, nby):
            mx, my = nax+nbx, nay+nby
            ml = math.hypot(mx, my)
            if ml < 1e-8:
                return (px+nbx*half, py+nby*half)
            mx /= ml; my /= ml
            cos_a = max(abs(mx*nax + my*nay), 1.0/miter_limit)
            d = min(half/cos_a, miter_limit*half)
            return (px+mx*d, py+my*d)

        if abs(c) < 1e-6:
            L.append((px+nx1*half, py+ny1*half))
            R.append((px-nx1*half, py-ny1*half))
        elif c > 0:
            L.append((px+nx0*half, py+ny0*half))
            L.append((px+nx1*half, py+ny1*half))
            R.append(mpt(-nx0, -ny0, -nx1, -ny1))
        else:
            L.append(mpt(nx0, ny0, nx1, ny1))
            R.append((px-nx0*half, py-ny0*half))
            R.append((px-nx1*half, py-ny1*half))

    _, _, nx, ny = segs[-1]
    L.append((pts[-1][0]+nx*half, pts[-1][1]+ny*half))
    R.append((pts[-1][0]-nx*half, pts[-1][1]-ny*half))
    return L + list(reversed(R))


# ── A mark geometry (100 × 120 viewport) ─────────────────────────────────────
_T = 60/112
LEGS_VU = [(14,110),(14,116),(8,116),(50,4),(92,116),(86,116),(86,110)]
XBAR_VU  = [(50-_T*42, 64), (50+_T*42, 64)]

def _px(pts, sx, sy, ox, oy):
    return [(ox+x*sx, oy+y*sy) for x, y in pts]

def draw_mark_polys(draw, ox, oy, mw, mh, color=GOLD):
    sx, sy = mw/100.0, mh/120.0
    stroke = mw * 0.068          # heavier than 0.048 — commanding weight
    legs_px = _px(LEGS_VU, sx, sy, ox, oy)
    xbar_px = _px(XBAR_VU, sx, sy, ox, oy)
    lg = stroke_poly(legs_px, stroke)
    xb = stroke_poly(xbar_px, stroke)
    if lg: draw.polygon(lg, fill=color)
    if xb: draw.polygon(xb, fill=color)


# ── Tactical frame overlays ───────────────────────────────────────────────────

def rect_poly(cx, cy, angle_rad, length, width):
    ux, uy = math.cos(angle_rad), math.sin(angle_rad)
    px, py = -uy, ux
    hw, hl = width/2, length/2
    return [
        (cx+ux*hl+px*hw, cy+uy*hl+py*hw),
        (cx+ux*hl-px*hw, cy+uy*hl-py*hw),
        (cx-ux*hl-px*hw, cy-uy*hl-py*hw),
        (cx-ux*hl+px*hw, cy-uy*hl+py*hw),
    ]

def draw_tick(draw, cx, cy, angle_deg, r_outer, length, width, color):
    a = math.radians(angle_deg)
    r_inner = r_outer - length
    x1 = cx + r_outer*math.cos(a);  y1 = cy + r_outer*math.sin(a)
    x2 = cx + r_inner*math.cos(a);  y2 = cy + r_inner*math.sin(a)
    draw.polygon(rect_poly((x1+x2)/2, (y1+y2)/2, a, length, width), fill=color)

def draw_corner_bracket(draw, ex, ey, corner, arm, stroke, color):
    sx = 1 if corner in ('tr','br') else -1
    sy = 1 if corner in ('bl','br') else -1
    draw.polygon([
        (ex,            ey),
        (ex+sx*arm,     ey),
        (ex+sx*arm,     ey+sy*stroke),
        (ex+sx*stroke,  ey+sy*stroke),
        (ex+sx*stroke,  ey+sy*arm),
        (ex,            ey+sy*arm),
    ], fill=color)

def draw_frame(draw, cx, cy, ring_r, ring_stroke,
               bracket_inset, bracket_arm, bracket_stroke,
               canvas_w, canvas_h):
    """Corner brackets + cardinal ticks (no ring — handled by draw_globe)."""
    tick_len = ring_stroke * 4.0
    tick_w   = ring_stroke * 0.70
    for a in (0, 90, 180, 270):
        draw_tick(draw, cx, cy, a-90,
                  ring_r + ring_stroke/2 + tick_len,
                  tick_len, tick_w, GOLD)

    bi = bracket_inset
    for corner, ex, ey in [
        ('tl', bi,             bi),
        ('tr', canvas_w-bi,   bi),
        ('bl', bi,             canvas_h-bi),
        ('br', canvas_w-bi,   canvas_h-bi),
    ]:
        draw_corner_bracket(draw, ex, ey, corner, bracket_arm, bracket_stroke, GOLD_MID)


# ── Wordmark helpers ──────────────────────────────────────────────────────────

def draw_tracked_text(draw, text, cx, y, font, color, tracking_px=0):
    chars = list(text)
    widths = [font.getbbox(c)[2] - font.getbbox(c)[0] for c in chars]
    total  = sum(widths) + tracking_px * (len(chars)-1)
    x = cx - total/2
    for ch, w in zip(chars, widths):
        bb = font.getbbox(ch)
        draw.text((x - bb[0], y - bb[1]), ch, font=font, fill=color)
        x += w + tracking_px

def draw_thin_rule(draw, cx, y, half_len, thickness, color):
    draw.polygon([
        (cx-half_len, y-thickness/2), (cx+half_len, y-thickness/2),
        (cx+half_len, y+thickness/2), (cx-half_len, y+thickness/2),
    ], fill=color)


# ── Renderers ─────────────────────────────────────────────────────────────────

def render_icon(canvas=1024, ss=4):
    W = H = canvas * ss
    mw, mh = 480*ss, 576*ss
    ox, oy = (W-mw)//2, (H-mh)//2
    cx = cy = W//2
    ring_r  = int(mw * 0.625)
    ring_s  = int(mw * 0.022)
    line_s  = int(ring_s * 0.50)
    bi  = int(W * 0.130)
    arm = int(W * 0.050)
    bst = int(W * 0.008)

    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw_globe(draw, cx, cy, ring_r, ring_s, line_s)
    draw_frame(draw, cx, cy, ring_r, ring_s, bi, arm, bst, W, H)
    draw_mark_polys(draw, ox, oy, mw, mh)

    return img.resize((canvas, canvas), Image.LANCZOS)


def render_launch(cw, ch, mark_w_px, ss=4):
    W, H  = cw*ss, ch*ss
    mw    = mark_w_px * ss
    mh    = int(mw * 1.2)

    # Position group (globe+mark+wordmark) at visual centre of screen
    try:
        font_main = ImageFont.truetype(FUTURA_BOLD, int(mw*0.063), index=FUTURA_IDX)
        font_sub  = ImageFont.truetype(FUTURA_BOLD, int(mw*0.032), index=FUTURA_MED)
    except Exception:
        font_main = font_sub = ImageFont.load_default()

    cap_h  = font_main.getbbox("A")[3] - font_main.getbbox("A")[1]
    wm_gap = int(mw * 0.11)
    group_h = mh + wm_gap + cap_h

    mark_oy = (H - group_h) // 2
    mark_ox = (W - mw) // 2
    cx = W // 2
    cy = mark_oy + mh // 2

    ring_r  = int(mw * 0.625)
    ring_s  = int(mw * 0.022)
    line_s  = int(ring_s * 0.50)
    bi  = int(W * 0.090)
    arm = int(W * 0.040)
    bst = int(W * 0.006)

    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw_globe(draw, cx, cy, ring_r, ring_s, line_s)
    draw_frame(draw, cx, cy, ring_r, ring_s, bi, arm, bst, W, H)
    draw_mark_polys(draw, mark_ox, mark_oy, mw, mh)

    # Wordmark
    wm_y = mark_oy + mh + wm_gap

    tracking = int(font_main.size * 0.42)
    chars  = list("THE ADMINISTRATION")
    widths = [font_main.getbbox(c)[2] - font_main.getbbox(c)[0] for c in chars]
    total_w = sum(widths) + tracking * (len(chars)-1)

    # Flanking rules: ──  THE ADMINISTRATION  ──
    rule_gap = int(font_main.size * 0.50)
    rule_len = int(mw * 0.11)
    rule_t   = max(2, int(ring_s * 0.20))
    rule_y   = wm_y + cap_h // 2
    lx = cx - total_w//2 - rule_gap - rule_len//2
    rx = cx + total_w//2 + rule_gap + rule_len//2
    draw_thin_rule(draw, lx, rule_y, rule_len//2, rule_t, GOLD_DIM)
    draw_thin_rule(draw, rx, rule_y, rule_len//2, rule_t, GOLD_DIM)
    draw_tracked_text(draw, "THE ADMINISTRATION", cx, wm_y, font_main, GOLD_MID, tracking)

    # Protocol label
    proto_y = H - int(H * 0.048)
    draw_tracked_text(draw, "SCI  //  NOFORN  //  EYES ONLY", cx, proto_y,
                      font_sub, GOLD_DIM, int(font_sub.size * 0.22))

    return img.resize((cw, ch), Image.LANCZOS)


# ── Export ────────────────────────────────────────────────────────────────────

def export(path, img):
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"  ✓  {out}  ({img.width}×{img.height})")

ROOT   = Path(__file__).parent.parent
ASSETS = ROOT / "ios/TheAdministration/Resources/Assets.xcassets"

print("\nGenerating brand assets…\n")

export(ASSETS/"AppIcon.appiconset/icon-command-globe-minimal-1024.png",
       render_icon(1024))

for fname, cw, ch, mw_px in [
    ("launch@1x.png",  390,  844,  190),
    ("launch@2x.png",  780, 1688,  380),
    ("launch@3x.png", 1170, 2532,  570),
]:
    export(ASSETS/f"LaunchImage.imageset/{fname}",
           render_launch(cw, ch, mw_px))

print("\nDone.")
