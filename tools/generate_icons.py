"""Generate PNG icons for PWA without external dependencies."""
import os
import struct
import zlib

def make_png(size, pixels):
    """pixels: list of rows, each row is list of (r,g,b,a) tuples."""
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    raw = b''
    for row in pixels:
        raw += b'\x00'  # filter type 0 (None)
        for r, g, b, a in row:
            raw += struct.pack('BBBB', r, g, b, a)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))

def lerp(a, b, t):
    return int(a + (b - a) * t)

def inside_rounded_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = max(x0 + r, min(x, x1 - r))
    cy = max(y0 + r, min(y, y1 - r))
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def render(size, maskable=False):
    px = []
    # Safe zone for maskable icons
    m = int(size * 0.15) if maskable else 0
    for y in range(size):
        row = []
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            # Background gradient #1e3c72 -> #2a5298
            r = lerp(0x1e, 0x2a, t)
            g = lerp(0x3c, 0x52, t)
            b = lerp(0x72, 0x98, t)

            # Tablet: white rounded rect in the center
            tw = size * 0.62
            th = size * 0.56
            tx0 = (size - tw) / 2 + m
            ty0 = (size - th) / 2 + m
            tx1 = tx0 + tw
            ty1 = ty0 + th
            rr = size * 0.07
            if inside_rounded_rect(x, y, tx0, ty0, tx1, ty1, rr):
                r, g, b = 0xFF, 0xFF, 0xFF

                # Grid lines inside the tablet (schedule)
                gx0 = int(tx0 + size * 0.06)
                gy0 = int(ty0 + size * 0.12)
                gx1 = int(tx1 - size * 0.06)
                gy1 = int(ty1 - size * 0.28)
                if gy0 <= y <= gy1 and gx0 <= x <= gx1:
                    # light gray grid
                    if (y - gy0) % max(2, int(size * 0.045)) < max(1, int(size * 0.012)) or \
                       (x - gx0) % max(2, int(size * 0.045)) < max(1, int(size * 0.012)):
                        r, g, b = 0xD8, 0xDE, 0xE8

                # Two colored cells in the grid (shift R orange, N blue)
                cw = (gx1 - gx0) // 3
                cx0 = gx0 + cw // 2
                cx1 = gx0 + cw + cw // 2
                cy0p = gy0 + (gy1 - gy0) // 3
                cy1p = gy0 + 2 * (gy1 - gy0) // 3
                if cx0 <= x <= cx1 and gy0 <= y <= cy0p:
                    r, g, b = 0xF3, 0x9C, 0x12  # R
                if cx1 <= x <= gx1 and cy0p <= y <= cy1p:
                    r, g, b = 0x29, 0x80, 0xB9  # N

                # Brigade stripes A/B/C/D at the bottom of the tablet
                sy0 = int(ty1 - size * 0.16)
                if y > sy0:
                    sw = tw / 4
                    idx = min(3, int((x - tx0) / sw))
                    colors = [
                        (0xE7, 0x4C, 0x3C),  # A red
                        (0x27, 0xAE, 0x60),  # B green
                        (0x29, 0x80, 0xB9),  # C blue
                        (0x8E, 0x44, 0xAD),  # D purple
                    ]
                    r, g, b = colors[idx]
                    # stripe separation
                    if abs(x - (tx0 + (idx + 0.5) * sw)) < size * 0.006:
                        r, g, b = 0x20, 0x30, 0x50
            else:
                # subtle dot grid on background
                if maskable:
                    if (x % max(4, int(size * 0.03)) < 1) and (y % max(4, int(size * 0.03)) < 1):
                        r = min(255, r + 20); g = min(255, g + 24); b = min(255, b + 30)

            row.append((r, g, b, 255))
        px.append(row)
    return px

os.makedirs('icons', exist_ok=True)

for size, name, maskable in [
    (192, 'icons/icon-192.png', False),
    (512, 'icons/icon-512.png', False),
    (512, 'icons/icon-512-maskable.png', True),
]:
    with open(name, 'wb') as f:
        f.write(make_png(size, render(size, maskable)))
    print(f'{name} -> OK ({size}x{size})')

print('ALL_ICONS_OK')